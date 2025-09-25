import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useInstruction,
  useInstructionExamples,
  useInstructionMutations,
  useInstructionRules,
} from '../features/instructions/hooks/useInstructions';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { createEmptyExample, createEmptyRule, Instruction, InstructionExample, InstructionRule } from '../types/instruction';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../hooks/useToast';

const composePrompt = (instruction: Instruction | null | undefined, rules: InstructionRule[] | undefined) => {
  if (!instruction) return '';
  const ruleBlock = (rules ?? [])
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .map((rule, index) => {
      const constraints = rule.constraints?.length ? `\n- ${rule.constraints.join('\n- ')}` : '';
      return `Rule ${index + 1}: ${rule.title}${constraints ? `\n${constraints}` : ''}\nOutput: ${rule.output_format}`;
    })
    .join('\n\n');

  const variableList = instruction.variables?.length ? `\nVariables: {{${instruction.variables.join('}}, {{')}}}` : '';

  return `Instruction: ${instruction.title}\nGoal: ${instruction.goal}\n${instruction.body}${variableList}\n\n${ruleBlock}`.trim();
};

const InstructionDetailPage = () => {
  const { instructionId } = useParams<{ instructionId: string }>();
  const navigate = useNavigate();
  const { data: instruction, isLoading, isError } = useInstruction(instructionId);
  const { data: rules } = useInstructionRules(instructionId);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const { data: examples } = useInstructionExamples(instructionId, selectedRuleId ?? undefined);
  const { updateInstruction, deleteInstruction, upsertRule, deleteRule, upsertExample, deleteExample } =
    useInstructionMutations();
  const { showToast } = useToast();

  const [draftInstruction, setDraftInstruction] = useState<Instruction | null>(null);
  const [ruleDraft, setRuleDraft] = useState<InstructionRule | null>(null);
  const [exampleDraft, setExampleDraft] = useState<InstructionExample | null>(null);
  const [isSavingInstruction, setIsSavingInstruction] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isSavingExample, setIsSavingExample] = useState(false);

  const currentInstruction = draftInstruction ?? instruction ?? null;

  const composedPrompt = useMemo(() => composePrompt(instruction, rules), [instruction, rules]);

  const statusLabel: Record<Instruction['status'], string> = {
    draft: 'Nháp',
    active: 'Đang dùng',
    archived: 'Lưu trữ',
  };

  if (isLoading) return <LoadingState label="Đang tải hướng dẫn..." />;
  if (isError || !instruction || !instructionId) return <ErrorState message="Không tìm thấy hướng dẫn." />;

  const handleUpdateInstruction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!instructionId) return;
    setIsSavingInstruction(true);
    try {
      await updateInstruction.mutateAsync({ id: instructionId, data: currentInstruction! });
      showToast({ message: 'Đã cập nhật hướng dẫn.', type: 'success' });
      setDraftInstruction(null);
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể cập nhật hướng dẫn.', type: 'error' });
    } finally {
      setIsSavingInstruction(false);
    }
  };

  const handleDeleteInstruction = async () => {
    if (!instructionId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xoá hướng dẫn này?')) return;
    await deleteInstruction.mutateAsync(instructionId);
    showToast({ message: 'Đã xoá hướng dẫn.', type: 'info' });
    navigate('/instructions');
  };

  const handleSaveRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!instructionId || !ruleDraft) return;
    setIsSavingRule(true);
    try {
      await upsertRule.mutateAsync({
        instructionId,
        ruleId: ruleDraft.id,
        data: { ...ruleDraft, constraints: ruleDraft.constraints?.filter(Boolean) ?? [] },
      });
      setRuleDraft(null);
      showToast({ message: 'Đã lưu quy tắc.', type: 'success' });
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể lưu quy tắc.', type: 'error' });
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!instructionId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xoá quy tắc này?')) return;
    await deleteRule.mutateAsync({ instructionId, ruleId });
    if (selectedRuleId === ruleId) setSelectedRuleId(null);
    showToast({ message: 'Đã xoá quy tắc.', type: 'info' });
  };

  const handleCreateRule = () => {
    const priority = (rules?.length ?? 0) + 1;
    setRuleDraft(createEmptyRule(priority));
  };

  const handleSaveExample = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!instructionId || !selectedRuleId || !exampleDraft) return;
    setIsSavingExample(true);
    try {
      await upsertExample.mutateAsync({ instructionId, ruleId: selectedRuleId, exampleId: exampleDraft.id, data: exampleDraft });
      setExampleDraft(null);
      showToast({ message: 'Đã lưu ví dụ.', type: 'success' });
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể lưu ví dụ.', type: 'error' });
    } finally {
      setIsSavingExample(false);
    }
  };

  const handleDeleteExample = async (exampleId: string) => {
    if (!instructionId || !selectedRuleId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xoá ví dụ này?')) return;
    await deleteExample.mutateAsync({ instructionId, ruleId: selectedRuleId, exampleId });
    showToast({ message: 'Đã xoá ví dụ.', type: 'info' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Hướng dẫn AI</p>
              <h2 className="text-2xl font-semibold text-slate-900">{instruction.title}</h2>
            </div>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={instruction.status}>{statusLabel[instruction.status]}</StatusBadge>
            <button
              type="button"
              onClick={handleDeleteInstruction}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
            >
              Xoá hướng dẫn
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateInstruction} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Tiêu đề</label>
              <input
                value={currentInstruction?.title ?? ''}
                onChange={(event) =>
                  setDraftInstruction((prev) => ({ ...(prev ?? instruction), title: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mục tiêu</label>
              <input
                value={currentInstruction?.goal ?? ''}
                onChange={(event) => setDraftInstruction((prev) => ({ ...(prev ?? instruction), goal: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Ngôn ngữ</label>
              <input
                value={currentInstruction?.lang ?? ''}
                onChange={(event) => setDraftInstruction((prev) => ({ ...(prev ?? instruction), lang: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Trạng thái</label>
              <select
                value={currentInstruction?.status ?? 'draft'}
                onChange={(event) =>
                  setDraftInstruction((prev) => ({ ...(prev ?? instruction), status: event.target.value as Instruction['status'] }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              >
                <option value="draft">Nháp</option>
                <option value="active">Đang dùng</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phiên bản</label>
              <input
                type="number"
                value={currentInstruction?.version ?? 1}
                onChange={(event) =>
                  setDraftInstruction((prev) => ({ ...(prev ?? instruction), version: Number(event.target.value) }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nội dung chính</label>
              <textarea
                rows={6}
                value={currentInstruction?.body ?? ''}
                onChange={(event) => setDraftInstruction((prev) => ({ ...(prev ?? instruction), body: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Biến</label>
              <input
                value={currentInstruction?.variables?.join(', ') ?? ''}
                onChange={(event) =>
                  setDraftInstruction((prev) => ({
                    ...(prev ?? instruction),
                    variables: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingInstruction}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingInstruction ? 'Đang lưu...' : 'Lưu hướng dẫn'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Quy tắc</p>
              <h2 className="text-xl font-semibold text-slate-900">Quản lý quy tắc</h2>
            </div>
          </CardTitle>
          <button
            type="button"
            onClick={handleCreateRule}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
          >
            Thêm quy tắc
          </button>
        </CardHeader>
        <CardContent>
          {rules && rules.length > 0 ? (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rounded-2xl border px-4 py-4 transition ${selectedRuleId === rule.id ? 'border-primary-300 bg-primary-50/40' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rule.title || 'Quy tắc chưa đặt tên'}</p>
                      <p className="text-xs text-slate-500">Ưu tiên: {rule.priority ?? 0}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={rule.status}>{statusLabel[rule.status as Instruction['status']]}</StatusBadge>
                      <button
                        type="button"
                        onClick={() => setSelectedRuleId(rule.id ?? null)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                      >
                        Ví dụ
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleDraft(rule)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => rule.id && handleDeleteRule(rule.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                  {rule.constraints?.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-6 text-xs text-slate-600">
                      {rule.constraints.map((constraint, idx) => (
                        <li key={idx}>{constraint}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                    Đầu ra: {rule.output_format || '—'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có quy tắc" description="Thêm quy tắc mới để mô tả yêu cầu chi tiết." />
          )}

          {ruleDraft ? (
            <form onSubmit={handleSaveRule} className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-5 space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Tiêu đề</label>
                <input
                  value={ruleDraft.title}
                  onChange={(event) => setRuleDraft((prev) => prev && { ...prev, title: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Ràng buộc</label>
                <textarea
                  rows={4}
                  value={ruleDraft.constraints?.join('\n') ?? ''}
                  onChange={(event) =>
                    setRuleDraft((prev) => prev && { ...prev, constraints: event.target.value.split('\n').filter(Boolean) })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Định dạng đầu ra</label>
                <textarea
                  rows={3}
                  value={ruleDraft.output_format}
                  onChange={(event) => setRuleDraft((prev) => prev && { ...prev, output_format: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Ưu tiên</label>
                  <input
                    type="number"
                    value={ruleDraft.priority}
                    onChange={(event) => setRuleDraft((prev) => prev && { ...prev, priority: Number(event.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                  <select
                    value={ruleDraft.status}
                    onChange={(event) => setRuleDraft((prev) => prev && { ...prev, status: event.target.value as InstructionRule['status'] })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                  >
                    <option value="draft">Nháp</option>
                    <option value="active">Đang dùng</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRuleDraft(null)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isSavingRule}
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingRule ? 'Đang lưu...' : 'Lưu quy tắc'}
                </button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {selectedRuleId ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Ví dụ</p>
                <h2 className="text-xl font-semibold text-slate-900">Ví dụ cho quy tắc</h2>
              </div>
            </CardTitle>
            <button
              type="button"
              onClick={() => setExampleDraft(createEmptyExample())}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
            >
              Thêm ví dụ
            </button>
          </CardHeader>
          <CardContent>
            {examples && examples.length > 0 ? (
              <div className="space-y-4">
                {examples.map((example) => (
                  <div key={example.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{example.name || 'Ví dụ'}</p>
                        <p className="text-xs text-slate-500">{example.is_gold ? 'Chuẩn (gold)' : 'Tham khảo'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExampleDraft(example)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => example.id && handleDeleteExample(example.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                        >
                        Xoá
                      </button>
                    </div>
                  </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Đầu vào</p>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{example.input_example}</pre>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Kỳ vọng</p>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{example.expected_output}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có ví dụ" description="Tạo ví dụ để kiểm thử Gemini." />
            )}

            {exampleDraft ? (
              <form onSubmit={handleSaveExample} className="mt-6 space-y-4 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-5">
                <div>
                  <label className="text-sm font-medium text-slate-700">Tên ví dụ</label>
                  <input
                    value={exampleDraft.name}
                    onChange={(event) => setExampleDraft((prev) => prev && { ...prev, name: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Đầu vào</label>
                    <textarea
                      rows={5}
                      value={exampleDraft.input_example}
                      onChange={(event) => setExampleDraft((prev) => prev && { ...prev, input_example: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Đầu ra kỳ vọng</label>
                    <textarea
                      rows={5}
                      value={exampleDraft.expected_output}
                      onChange={(event) => setExampleDraft((prev) => prev && { ...prev, expected_output: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="is_gold"
                    type="checkbox"
                    checked={exampleDraft.is_gold}
                    onChange={(event) => setExampleDraft((prev) => prev && { ...prev, is_gold: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_gold" className="text-sm text-slate-600">
                    Đánh dấu là ví dụ chuẩn (gold)
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setExampleDraft(null)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingExample}
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingExample ? 'Đang lưu...' : 'Lưu ví dụ'}
                  </button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Compose Preview</p>
              <h2 className="text-xl font-semibold text-slate-900">Prompt tổng hợp</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            readOnly
            rows={12}
            value={composedPrompt}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(composedPrompt);
                showToast({ message: 'Đã sao chép prompt vào clipboard.', type: 'success' });
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
            >
              Sao chép prompt
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructionDetailPage;
