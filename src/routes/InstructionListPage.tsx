import { FormEvent, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useInstructions, useInstructionMutations } from '../features/instructions/hooks/useInstructions';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { createEmptyInstruction, Instruction, InstructionStatus } from '../types/instruction';
import { StatusBadge } from '../components/common/StatusBadge';
import { useToast } from '../hooks/useToast';

const InstructionListPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useInstructions();
  const { createInstruction } = useInstructionMutations();
  const [newInstruction, setNewInstruction] = useState(() => createEmptyInstruction());
  const [isCreating, setIsCreating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [filters, setFilters] = useState({
    title: '',
    goal: '',
    status: '',
    version: '',
    updatedAt: '',
  });
  const { showToast } = useToast();

  const statusLabel: Record<InstructionStatus, string> = {
    draft: 'Nháp',
    active: 'Đang dùng',
    archived: 'Lưu trữ',
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((instruction) => {
      const matchesTitle = instruction.title.toLowerCase().includes(filters.title.toLowerCase());
      const matchesGoal = instruction.goal.toLowerCase().includes(filters.goal.toLowerCase());
      const matchesStatus = filters.status ? instruction.status === filters.status : true;
      const matchesVersion = filters.version
        ? String(instruction.version).toLowerCase().includes(filters.version.toLowerCase())
        : true;
      const matchesUpdated = filters.updatedAt
        ? (instruction.updatedAt ?? '').toLowerCase().includes(filters.updatedAt.toLowerCase())
        : true;
      return matchesTitle && matchesGoal && matchesStatus && matchesVersion && matchesUpdated;
    });
  }, [data, filters]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hasMissingRequired = !newInstruction.title.trim() || !newInstruction.body.trim();
    if (hasMissingRequired) {
      setShowValidation(true);
      showToast({ message: 'Vui lòng điền đầy đủ tiêu đề và nội dung chính.', type: 'error' });
      if (!newInstruction.title.trim()) {
        titleRef.current?.focus();
      } else if (!newInstruction.body.trim()) {
        bodyRef.current?.focus();
      }
      return;
    }
    setIsCreating(true);
    try {
      await createInstruction.mutateAsync(newInstruction);
      setNewInstruction(createEmptyInstruction());
      setShowValidation(false);
      setIsCreateSectionOpen(false);
      showToast({ message: 'Đã tạo hướng dẫn mới.', type: 'success' });
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể tạo hướng dẫn.', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) return <LoadingState label="Đang tải hướng dẫn AI..." />;
  if (isError) return <ErrorState message="Không thể tải danh sách hướng dẫn." />;

  const handleDuplicate = async (instructionId: string) => {
    const instruction = data?.find((item) => item.id === instructionId);
    if (!instruction) return;
    const payload: Instruction = { ...instruction };
    delete (payload as Partial<Instruction>).id;
    delete (payload as Partial<Instruction>).updatedAt;
    delete (payload as Partial<Instruction>).publishedAt;
    try {
      await createInstruction.mutateAsync({
        ...payload,
        title: `${instruction.title} (bản sao)`,
        status: 'draft',
      });
      showToast({ message: 'Đã nhân bản hướng dẫn.', type: 'success' });
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể nhân bản hướng dẫn.', type: 'error' });
    }
  };

  const handleRowClick = (instructionId: string) => {
    navigate(`/instructions/${instructionId}`);
  };

  const clearFilters = () =>
    setFilters({
      title: '',
      goal: '',
      status: '',
      version: '',
      updatedAt: '',
    });

  const requiredInputClasses = (hasError: boolean) =>
    clsx(
      'mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-0',
      hasError
        ? 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/40'
        : 'border-slate-200 focus:border-primary-400',
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Hướng dẫn AI</p>
              <h2 className="text-xl font-semibold text-slate-900">Tạo hướng dẫn mới</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isCreateSectionOpen ? (
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600">
                Nhấn nút bên dưới để mở biểu mẫu tạo hướng dẫn mới kèm mô tả chi tiết cho từng trường.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateSectionOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
              >
                Thêm hướng dẫn mới
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Tên hiển thị của hướng dẫn để dễ dàng nhận biết và tìm kiếm.
                </p>
                <input
                  value={newInstruction.title}
                  onChange={(event) => setNewInstruction((prev) => ({ ...prev, title: event.target.value }))}
                  onBlur={() => setShowValidation(true)}
                  className={requiredInputClasses(showValidation && !newInstruction.title.trim())}
                  ref={titleRef}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Ngôn ngữ</label>
                <p className="mt-1 text-xs text-slate-500">Ngôn ngữ chính mà prompt sẽ sử dụng để trả lời.</p>
                <input
                  value={newInstruction.lang}
                  onChange={(event) => setNewInstruction((prev) => ({ ...prev, lang: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mục tiêu</label>
                <p className="mt-1 text-xs text-slate-500">Mô tả ngắn gọn mục đích của hướng dẫn này cho đội AI.</p>
                <input
                  value={newInstruction.goal}
                  onChange={(event) => setNewInstruction((prev) => ({ ...prev, goal: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Nội dung chính <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Viết đầy đủ hướng dẫn chi tiết cho mô hình AI, bao gồm yêu cầu, cấu trúc câu trả lời và các ràng buộc.
                </p>
                <textarea
                  rows={4}
                  value={newInstruction.body}
                  onChange={(event) => setNewInstruction((prev) => ({ ...prev, body: event.target.value }))}
                  onBlur={() => setShowValidation(true)}
                  className={requiredInputClasses(showValidation && !newInstruction.body.trim())}
                  ref={bodyRef}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                <p className="mt-1 text-xs text-slate-500">Chọn trạng thái khởi tạo cho hướng dẫn mới.</p>
                <select
                  value={newInstruction.status}
                  onChange={(event) => setNewInstruction((prev) => ({ ...prev, status: event.target.value as InstructionStatus }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                >
                  <option value="draft">Nháp</option>
                  <option value="active">Đang dùng</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Biến sử dụng</label>
                <p className="mt-1 text-xs text-slate-500">
                  Liệt kê các biến có thể sử dụng trong prompt, phân tách bằng dấu phẩy (ví dụ: company, guide, startDate).
                </p>
                <input
                  placeholder="company, guide, ..."
                  value={newInstruction.variables.join(', ')}
                  onChange={(event) =>
                    setNewInstruction((prev) => ({ ...prev, variables: event.target.value.split(',').map((item) => item.trim()) }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateSectionOpen(false);
                    setShowValidation(false);
                    setNewInstruction(createEmptyInstruction());
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo hướng dẫn'}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Danh sách</p>
              <h2 className="text-xl font-semibold text-slate-900">Danh sách hướng dẫn</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.length === 0 ? (
            <EmptyState title="Chưa có hướng dẫn" description="Tạo hướng dẫn mới để quản lý rules và ví dụ." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Tiêu đề</th>
                    <th className="px-4 py-3">Mục tiêu</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Phiên bản</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                  <tr className="bg-white text-xs text-slate-500">
                    <th className="px-4 py-2">
                      <input
                        value={filters.title}
                        onChange={(event) => setFilters((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Lọc tiêu đề"
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={filters.goal}
                        onChange={(event) => setFilters((prev) => ({ ...prev, goal: event.target.value }))}
                        placeholder="Lọc mục tiêu"
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <select
                        value={filters.status}
                        onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      >
                        <option value="">Tất cả</option>
                        <option value="draft">Nháp</option>
                        <option value="active">Đang dùng</option>
                        <option value="archived">Lưu trữ</option>
                      </select>
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={filters.version}
                        onChange={(event) => setFilters((prev) => ({ ...prev, version: event.target.value }))}
                        placeholder="v..."
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={filters.updatedAt}
                        onChange={(event) => setFilters((prev) => ({ ...prev, updatedAt: event.target.value }))}
                        placeholder="2024-..."
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                      >
                        Xoá lọc
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredData.map((instruction) => (
                    <tr
                      key={instruction.id}
                      className="hover:bg-primary-50/70 cursor-pointer"
                      onClick={() => instruction.id && handleRowClick(instruction.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary-600">{instruction.title}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{instruction.goal || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={instruction.status}>{statusLabel[instruction.status]}</StatusBadge></td>
                      <td className="px-4 py-3 text-slate-600">v{instruction.version}</td>
                      <td className="px-4 py-3 text-slate-500">{instruction.updatedAt ? instruction.updatedAt.substring(0, 10) : '—'}</td>
                      <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/instructions/${instruction.id}`}
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                          >
                            Xem
                          </Link>
                          <Link
                            to={`/instructions/${instruction.id}`}
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                          >
                            Sửa
                          </Link>
                          <button
                            type="button"
                            onClick={() => instruction.id && handleDuplicate(instruction.id)}
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                          >
                            Nhân bản
                          </button>
                        </div>
                      </td>
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
