import { formatDateLabel } from './formatDisplay.js'
import { chatWithProviderChain } from './providerChain.js'
import { buildPreview, executeReadTool, findSpace } from './toolExecutor.js'
import {
  buildAssistantSystemPrompt,
  composeReply,
  parseActionBlock,
  stripActionBlock,
} from './assistantTools.js'
import { signPendingAction } from './pendingAction.js'
import { isReadTool, isWriteTool } from './toolSchemas.js'

function normalizeActionFromToolCall(toolCall) {
  if (!toolCall?.function?.name) return null
  let args = {}
  try {
    args = JSON.parse(toolCall.function.arguments || '{}')
  } catch {
    args = {}
  }
  return { tool: toolCall.function.name, args }
}

export function parseAssistantOutput(text, toolCalls) {
  if (toolCalls?.length) {
    const first = normalizeActionFromToolCall(toolCalls[0])
    if (first && isReadTool(first.tool)) {
      return { phase: 'read', tool: first.tool, args: first.args }
    }
    if (first && isWriteTool(first.tool)) {
      return {
        phase: 'confirm',
        tool: first.tool,
        args: first.args,
        preview: buildPreview(first.tool, first.args, {}),
        destructive: ['delete_space', 'delete_list', 'delete_task', 'delete_subtask'].includes(first.tool),
      }
    }
  }

  const block = parseActionBlock(text)
  if (!block) return { phase: 'chat', reply: stripActionBlock(text) || text }

  if (block.phase === 'clarify') {
    return { phase: 'clarify', reply: block.reply || stripActionBlock(text) }
  }
  if (block.phase === 'read' && block.tool) {
    return { phase: 'read', tool: block.tool, args: block.args || {} }
  }
  if (block.phase === 'confirm' && block.tool) {
    return {
      phase: 'confirm',
      tool: block.tool,
      args: block.args || {},
      preview: block.preview || buildPreview(block.tool, block.args || {}, {}),
      destructive: Boolean(block.destructive),
    }
  }

  if (block.tool && isReadTool(block.tool)) {
    const { tool, phase: _p1, ...args } = block
    return { phase: 'read', tool, args }
  }
  if (block.tool && isWriteTool(block.tool)) {
    const { tool, phase: _p2, preview, destructive, ...args } = block
    return {
      phase: 'confirm',
      tool,
      args,
      preview: preview || buildPreview(tool, args, {}),
      destructive: Boolean(destructive) || ['delete_space', 'delete_list', 'delete_task', 'delete_subtask'].includes(tool),
    }
  }

  return { phase: 'chat', reply: stripActionBlock(text) || text }
}

export async function runAgentTurn({
  admin,
  client,
  userId,
  messages,
  workspaceContext,
  mode = 'text',
}) {
  const ctx = { client, userId, context: workspaceContext }

  const maxTokens = mode === 'voice' ? 150 : 200
  const { text, provider, toolCalls } = await chatWithProviderChain(admin, {
    messages: [
      { role: 'system', content: buildAssistantSystemPrompt(workspaceContext) },
      ...messages,
    ],
    maxTokens,
    tools: true,
  })

  const parsed = parseAssistantOutput(text, toolCalls)
  const baseReply = stripActionBlock(text) || text

  if (parsed.phase === 'read' && parsed.tool === 'suggest_schedule') {
    const schedule = await buildScheduleSuggestions(admin, client, userId, parsed.args || {}, workspaceContext)
    if (schedule.ok) {
      return {
        phase: 'confirm',
        reply: schedule.reply,
        pendingActions: schedule.pendingActions,
        mutated: false,
        llmUsed: true,
        provider: schedule.provider || provider,
      }
    }
    return {
      phase: 'chat',
      reply: schedule.message || 'Hindi makuha ang schedule suggestions.',
      pendingActions: [],
      mutated: false,
      llmUsed: true,
      provider,
    }
  }

  if (parsed.phase === 'read') {
    const result = await executeReadTool(parsed.tool, parsed.args, ctx)
    return {
      phase: 'read',
      reply: composeReply(baseReply, result),
      pendingActions: [],
      mutated: false,
      llmUsed: true,
      provider,
    }
  }

  if (parsed.phase === 'confirm') {
    const signed = signPendingAction({
      userId,
      tool: parsed.tool,
      args: parsed.args,
      preview: parsed.preview,
      destructive: parsed.destructive,
    })
    return {
      phase: 'confirm',
      reply: baseReply || parsed.preview,
      pendingActions: [signed],
      mutated: false,
      llmUsed: true,
      provider,
    }
  }

  if (parsed.phase === 'clarify') {
    return {
      phase: 'clarify',
      reply: parsed.reply || baseReply,
      pendingActions: [],
      mutated: false,
      llmUsed: true,
      provider,
    }
  }

  return {
    phase: 'chat',
    reply: parsed.reply || baseReply || 'Okay.',
    pendingActions: [],
    mutated: false,
    llmUsed: true,
    provider,
  }
}

export async function buildScheduleSuggestions(admin, client, userId, args, workspaceContext) {
  const ctx = { client, userId, context: workspaceContext }
  let tasks = workspaceContext.tasks.filter((t) => ['inbox', 'todo', 'in_progress'].includes(t.status))

  if (args.list_id) tasks = tasks.filter((t) => t.list_id === args.list_id)
  if (args.space_id) tasks = tasks.filter((t) => t.space_id === args.space_id)
  if (args.space) {
    const resolved = findSpace(workspaceContext.spaces, args.space)
    if (resolved.item) tasks = tasks.filter((t) => t.space_id === resolved.item.id)
  }

  const lines = tasks.map(
    (t) => `- id:${t.id} title:${t.title} due:${t.due_date || 'none'}`,
  )

  const { text, provider } = await chatWithProviderChain(admin, {
    maxTokens: 500,
    messages: [
      {
        role: 'system',
        content:
          'Suggest due dates. Return ONLY JSON array: [{ "taskId": "uuid", "suggestedDueDate": "ISO8601", "reason": "short" }].',
      },
      { role: 'user', content: `Tasks:\n${lines.join('\n')}` },
    ],
  })

  let suggestions = []
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const raw = match ? match[1] : text
    const parsed = JSON.parse(raw)
    suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || []
  } catch {
    suggestions = []
  }

  const updates = suggestions
    .filter((s) => s?.taskId && s?.suggestedDueDate)
    .slice(0, 20)
    .map((s) => ({ task_id: s.taskId, due_date: s.suggestedDueDate }))

  if (!updates.length) {
    return { ok: false, message: 'Walang schedule suggestions na nakuha.' }
  }

  const preview = updates.map((u) => {
    const task = tasks.find((t) => t.id === u.task_id)
    return `${task?.title || u.task_id} → ${formatDateLabel(u.due_date, workspaceContext.timezone)}`
  }).join('; ')

  const signed = signPendingAction({
    userId,
    tool: 'apply_schedule',
    args: { updates },
    preview: `Schedule ${updates.length} tasks: ${preview}`,
    destructive: false,
  })

  return {
    ok: true,
    reply: `May ${updates.length} suggested due dates. Review then Execute.`,
    pendingActions: [signed],
    provider,
    ctx,
  }
}
