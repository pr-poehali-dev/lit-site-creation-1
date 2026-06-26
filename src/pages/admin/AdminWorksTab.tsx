import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

const GENRES = ['Стихи', 'Рассказ', 'Фантазия', 'Эссе', 'Статьи', 'Разное'];

const COLOR_PALETTE = [
  { color: '#dc2626', label: 'Красный' },
  { color: '#2563eb', label: 'Синий' },
  { color: '#16a34a', label: 'Зелёный' },
  { color: '#d97706', label: 'Оранжевый' },
  { color: '#7c3aed', label: 'Фиолетовый' },
  { color: '#db2777', label: 'Розовый' },
  { color: '#0891b2', label: 'Бирюзовый' },
  { color: '#ca8a04', label: 'Золотой' },
];

interface Work {
  id: number;
  genre: string;
  title: string;
  excerpt: string;
  body: string;
  audio_url: string;
  image_url: string;
  read_time: string;
  created_at: string;
  published: boolean;
}

type FormData = Omit<Work, 'id' | 'created_at'>;

interface Props {
  works: Work[];
  loading: boolean;
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  editId: number | null;
  saving: boolean;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  deleteId: number | null;
  setDeleteId: (v: number | null) => void;
  visits: { today: number; total: number } | null;
  uploading: boolean;
  uploadProgress: string | null;
  token: string;
  dragItem: React.MutableRefObject<number | null>;
  dragOver: React.MutableRefObject<number | null>;
  onOpenNew: () => void;
  onOpenEdit: (w: Work) => void;
  onSave: () => void;
  onConfirmDelete: () => void;
  onHandleDrop: () => void;
  onUploadImage: (file: File) => void;
  onResetVisits: () => void;
  compressImage: (file: File, maxWidth?: number, quality?: number) => Promise<string>;
}

export default function AdminWorksTab({
  works, loading, form, setForm, editId, saving, showForm, setShowForm,
  deleteId, setDeleteId, visits, uploading, uploadProgress, token,
  dragItem, dragOver, onOpenNew, onOpenEdit, onSave, onConfirmDelete,
  onHandleDrop, onUploadImage, onResetVisits,
}: Props) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const excerptRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (style: 'normal' | 'italic' | 'bold') => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = form.body;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', end);
    const fullEnd = lineEnd === -1 ? text.length : lineEnd;
    const lines = text.slice(lineStart, fullEnd).split('\n');
    const formatted = lines.map((line) => {
      const stripped = line.replace(/^\*\*|\*\*$|^\*|\*$/g, '');
      if (style === 'bold') return `**${stripped}**`;
      if (style === 'italic') return `*${stripped}*`;
      return stripped;
    }).join('\n');
    const newBody = text.slice(0, lineStart) + formatted + text.slice(fullEnd);
    setForm((f) => ({ ...f, body: newBody }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(lineStart, lineStart + formatted.length); }, 0);
  };

  const applyColor = (color: string, ref: React.RefObject<HTMLTextAreaElement>, field: 'body' | 'excerpt') => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = field === 'body' ? form.body : form.excerpt;
    const selected = text.slice(start, end);
    if (!selected) return;
    const stripped = selected.replace(/\[color:[^\]]+\]|\[\/color\]/g, '');
    const formatted = color ? `[color:${color}]${stripped}[/color]` : stripped;
    const newText = text.slice(0, start) + formatted + text.slice(end);
    setForm((f) => ({ ...f, [field]: newText }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start, start + formatted.length); }, 0);
  };

  return (
    <div>
      {visits && (
        <div className="flex items-center gap-4 mb-8">
          <div className="flex gap-6 p-4 bg-card border border-border rounded-sm">
            <div className="text-center">
              <p className="text-2xl font-serif font-bold">{visits.today}</p>
              <p className="text-xs text-muted-foreground">сегодня</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-serif font-bold">{visits.total}</p>
              <p className="text-xs text-muted-foreground">всего посетителей</p>
            </div>
          </div>
          <Button
            size="sm" variant="outline"
            className="rounded-sm text-xs text-muted-foreground gap-1.5"
            onClick={onResetVisits}
          >
            <Icon name="RotateCcw" size={13} /> Обнулить
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl">Мои произведения</h1>
        <span className="text-muted-foreground text-sm">{works.length} текстов</span>
      </div>

      {loading && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Loader" size={32} className="animate-spin mx-auto mb-3" />
          <p>Загружаю…</p>
        </div>
      )}

      {!loading && works.length === 0 && (
        <div className="text-center py-24 border border-dashed border-border rounded-sm">
          <Icon name="PenLine" size={40} className="text-muted-foreground mx-auto mb-4" />
          <p className="font-serif text-2xl text-muted-foreground mb-2">Ещё нет ни одного произведения</p>
          <p className="text-muted-foreground text-sm mb-6">Нажмите «Новое произведение», чтобы добавить первое</p>
          <Button onClick={onOpenNew} className="bg-accent text-accent-foreground rounded-sm">Добавить произведение</Button>
        </div>
      )}

      {!loading && works.length > 0 && (
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Название</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Жанр</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Дата</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {works.map((w, i) => (
                <tr
                  key={w.id}
                  draggable
                  onDragStart={() => { dragItem.current = i; }}
                  onDragEnter={() => { dragOver.current = i; }}
                  onDragEnd={onHandleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={`border-b border-border last:border-0 cursor-grab active:opacity-50 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Icon name="GripVertical" size={14} className="text-muted-foreground/40 shrink-0" />
                      <div>
                        <p className="font-serif text-base">{w.title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{w.excerpt}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell text-muted-foreground">{w.genre}</td>
                  <td className="px-4 py-4 hidden md:table-cell text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-1 rounded-full ${w.published ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'}`}>
                      {w.published ? 'Опубликовано' : 'Черновик'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => onOpenEdit(w)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Icon name="Pencil" size={16} />
                      </button>
                      <button onClick={() => setDeleteId(w.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ФОРМА (модальное окно) */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-background border border-border rounded-sm w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-serif text-2xl">{editId ? 'Редактировать' : 'Новое произведение'}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={22} />
              </button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Жанр</label>
                  <select
                    value={form.genre}
                    onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                    className="w-full rounded-sm border border-border bg-card px-3 py-2 text-sm"
                  >
                    {GENRES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Время чтения (например: 5 мин)</label>
                  <Input
                    value={form.read_time}
                    onChange={(e) => setForm((f) => ({ ...f, read_time: e.target.value }))}
                    placeholder="5 мин"
                    className="rounded-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Название</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Название произведения"
                  className="rounded-sm"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Краткое описание (анонс)</label>
                <div className="flex gap-1.5 mb-2 flex-wrap items-center">
                  <span className="text-xs text-muted-foreground">Цвет:</span>
                  {COLOR_PALETTE.map(({ color, label }) => (
                    <button key={color} type="button" title={label} onClick={() => applyColor(color, excerptRef, 'excerpt')}
                      className="w-5 h-5 rounded-sm border border-border hover:scale-110 transition-transform shrink-0"
                      style={{ backgroundColor: color }} />
                  ))}
                  <button type="button" title="Убрать цвет" onClick={() => applyColor('', excerptRef, 'excerpt')} className="px-2 py-1 text-xs rounded-sm border border-border bg-card hover:bg-muted/40 transition-colors text-muted-foreground">✕</button>
                </div>
                <Textarea
                  ref={excerptRef}
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Несколько строк для привлечения внимания…"
                  rows={3}
                  className="rounded-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Полный текст</label>
                <div className="flex gap-1.5 mb-2">
                  <button type="button" onClick={() => applyFormat('normal')} className="px-3 py-1 text-xs rounded-sm border border-border bg-card hover:bg-muted/40 transition-colors">Обычный</button>
                  <button type="button" onClick={() => applyFormat('italic')} className="px-3 py-1 text-xs rounded-sm border border-border bg-card hover:bg-muted/40 transition-colors italic">Курсив</button>
                  <button type="button" onClick={() => applyFormat('bold')} className="px-3 py-1 text-xs rounded-sm border border-border bg-card hover:bg-muted/40 transition-colors font-bold">Жирный</button>
                  <div className="w-px bg-border mx-1" />
                  <span className="text-xs text-muted-foreground self-center">Цвет:</span>
                  {COLOR_PALETTE.map(({ color, label }) => (
                    <button key={color} type="button" title={label} onClick={() => applyColor(color, bodyRef, 'body')}
                      className="w-5 h-5 rounded-sm border border-border hover:scale-110 transition-transform shrink-0"
                      style={{ backgroundColor: color }} />
                  ))}
                  <button type="button" title="Убрать цвет" onClick={() => applyColor('', bodyRef, 'body')} className="px-2 py-1 text-xs rounded-sm border border-border bg-card hover:bg-muted/40 transition-colors text-muted-foreground">✕</button>
                </div>
                <Textarea
                  ref={bodyRef}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Введите полный текст произведения…"
                  rows={10}
                  className="rounded-sm resize-y font-serif text-base leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Выделите текст и нажмите кнопку форматирования или цветной кубик</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Иллюстрация (необязательно)</label>
                <div className="flex gap-2 items-center">
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-sm border border-border bg-card text-sm hover:bg-muted/40 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Icon name={uploading ? 'Loader' : 'ImageUp'} size={16} className={uploading ? 'animate-spin' : ''} />
                    {uploading ? 'Загружаю…' : 'Выбрать файл с ПК'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])}
                    />
                  </label>
                  {form.image_url && (
                    <button onClick={() => setForm((f) => ({ ...f, image_url: '' }))} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      Удалить
                    </button>
                  )}
                </div>
                {form.image_url && (
                  <img src={form.image_url} alt="Предпросмотр" className="mt-3 max-h-48 rounded-sm object-cover border border-border" />
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Ссылка на аудио (необязательно)</label>
                <Input
                  value={form.audio_url}
                  onChange={(e) => setForm((f) => ({ ...f, audio_url: e.target.value }))}
                  placeholder="https://…"
                  className="rounded-sm"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm">Опубликовать (видно читателям)</span>
              </label>
            </div>
            <div className="px-6 py-5 border-t border-border flex gap-3 justify-end">
              <Button onClick={() => setShowForm(false)} variant="outline" className="rounded-sm">Отмена</Button>
              <Button onClick={onSave} disabled={saving || !form.title.trim()} className="bg-accent text-accent-foreground rounded-sm gap-2">
                {saving ? <><Icon name="Loader" size={16} className="animate-spin" /> Сохраняю…</> : <><Icon name="Check" size={16} /> Сохранить</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ИНДИКАТОР ЗАГРУЗКИ ФОТО */}
      {uploadProgress && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-sm px-5 py-3 shadow-xl flex items-center gap-3 animate-fade-in">
          <Icon name="Loader" size={16} className="animate-spin shrink-0" />
          <div>
            <p className="text-xs font-medium">{uploadProgress}</p>
            <div className="mt-1.5 h-0.5 w-40 bg-background/20 rounded-full overflow-hidden">
              <div className={`h-full bg-accent rounded-full transition-all duration-700 ${
                uploadProgress.includes('Читаю') ? 'w-1/4' :
                uploadProgress.includes('Сжимаю') ? 'w-2/3' : 'w-full animate-pulse'
              }`} />
            </div>
          </div>
        </div>
      )}

      {/* ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-background border border-border rounded-sm p-8 max-w-sm w-full shadow-2xl text-center">
            <Icon name="Trash2" size={36} className="text-destructive mx-auto mb-4" />
            <h3 className="font-serif text-2xl mb-2">Удалить произведение?</h3>
            <p className="text-muted-foreground text-sm mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <Button onClick={() => setDeleteId(null)} variant="outline" className="flex-1 rounded-sm">Отмена</Button>
              <Button onClick={onConfirmDelete} className="flex-1 bg-destructive text-destructive-foreground rounded-sm">Удалить</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
