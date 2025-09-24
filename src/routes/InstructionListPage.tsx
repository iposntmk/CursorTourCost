import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInstructions, useInstructionMutations } from '../features/instructions/hooks/useInstructions';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { createEmptyInstruction, InstructionStatus } from '../types/instruction';
import { StatusBadge } from '../components/common/StatusBadge';

const InstructionListPage = () => {
  const { data, isLoading, isError } = useInstructions();
  const { createInstruction } = useInstructionMutations();
  const [newInstruction, setNewInstruction] = useState(() => createEmptyInstruction());
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      await createInstruction.mutateAsync(newInstruction);
      setNewInstruction(createEmptyInstruction());
      window.alert('Tạo instruction thành công');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) return <LoadingState label="Đang tải instructions..." />;
  if (isError) return <ErrorState message="Không tải được danh sách instructions" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Instruction</p>
              <h2 className="text-xl font-semibold text-slate-900">Tạo instruction mới</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Tiêu đề</label>
              <input
                required
                value={newInstruction.title}
                onChange={(event) => setNewInstruction((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Ngôn ngữ</label>
              <input
                value={newInstruction.lang}
                onChange={(event) => setNewInstruction((prev) => ({ ...prev, lang: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mục tiêu</label>
              <input
                value={newInstruction.goal}
                onChange={(event) => setNewInstruction((prev) => ({ ...prev, goal: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nội dung chính</label>
              <textarea
                required
                rows={4}
                value={newInstruction.body}
                onChange={(event) => setNewInstruction((prev) => ({ ...prev, body: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Trạng thái</label>
              <select
                value={newInstruction.status}
                onChange={(event) => setNewInstruction((prev) => ({ ...prev, status: event.target.value as InstructionStatus }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Biến động</label>
              <input
                placeholder="company,guide,..."
                value={newInstruction.variables.join(', ')}
                onChange={(event) =>
                  setNewInstruction((prev) => ({ ...prev, variables: event.target.value.split(',').map((item) => item.trim()) }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreating ? 'Đang tạo...' : 'Tạo instruction'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Danh sách</p>
              <h2 className="text-xl font-semibold text-slate-900">Instructions hiện có</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.length === 0 ? (
            <EmptyState title="Chưa có instruction" description="Hãy tạo instruction mới để quản lý rules và ví dụ." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Tiêu đề</th>
                    <th className="px-4 py-3">Mục tiêu</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.map((instruction) => (
                    <tr key={instruction.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <Link to={`/instructions/${instruction.id}`} className="font-semibold text-primary-600 hover:text-primary-500">
                          {instruction.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{instruction.goal || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={instruction.status}>{instruction.status}</StatusBadge></td>
                      <td className="px-4 py-3 text-slate-600">v{instruction.version}</td>
                      <td className="px-4 py-3 text-slate-500">{instruction.updatedAt ? instruction.updatedAt.substring(0, 10) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructionListPage;
