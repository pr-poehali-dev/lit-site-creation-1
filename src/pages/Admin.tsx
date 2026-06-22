import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

const WORKS_URL = 'https://functions.poehali.dev/97e50fe2-d8c6-47a8-86fc-bbb58aeb0192';
const AUTH_URL = 'https://functions.poehali.dev/04d359cd-5265-40e8-8b22-c336a2d73de4';

const GENRES = ['Стихи', 'Рассказ', 'Фантазия', 'Эссе'];

interface Work {
  id: number;
  genre: string;
  title: string;
  excerpt: string;
  body: string;
  audio_url: string;
  read_time: string;
  created_at: string;
  published: boolean;
}

const emptyForm = (): Omit<Work, 'id' | 'created_at'> => ({
  genre: 'Стихи',
  title: '',
  excerpt: '',
  body: '',
  audio_url: '',
  read_time: '',
  published: true,
});

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isLoggedIn = !!token;

  const login = async () => {
    setLoginLoading(true);
    setLoginError('');
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } else {
      setLoginError('Неверный пароль. Попробуйте ещё раз.');
    }
    setLoginLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
  };

  const fetchWorks = async () => {
    setLoading(true);
    const res = await fetch(WORKS_URL);
    const data = await res.json();
    setWorks(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) fetchWorks();
  }, [isLoggedIn]);

  const openNew = () => {
    setForm(emptyForm());
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (w: Work) => {
    setForm({
      genre: w.genre,
      title: w.title,
      excerpt: w.excerpt,
      body: w.body,
      audio_url: w.audio_url,
      read_time: w.read_time,
      published: w.published,
    });
    setEditId(w.id);
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${WORKS_URL}?id=${editId}` : WORKS_URL;
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    fetchWorks();
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    await fetch(`${WORKS_URL}?id=${deleteId}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': token },
    });
    setDeleteId(null);
    fetchWorks();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <p className="font-serif italic text-3xl text-center mb-2">Чернила <span className="text-accent">&</span> тишина</p>
          <p className="text-center text-muted-foreground text-sm mb-8">Вход для автора</p>
          <div className="bg-card border border-border rounded-sm p-8 space-y-4">
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              className="rounded-sm"
            />
            {loginError && <p className="text-destructive text-sm">{loginError}</p>}
            <Button onClick={login} disabled={loginLoading} className="w-full bg-primary text-primary-foreground rounded-sm">
              {loginLoading ? 'Вхожу…' : 'Войти'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* шапка */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="font-serif italic text-xl">Чернила <span className="text-accent">&</span> тишина</a>
          <span className="text-muted-foreground text-sm hidden sm:block">/ Панель автора</span>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openNew} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-sm gap-2">
            <Icon name="Plus" size={16} /> Новое произведение
          </Button>
          <Button onClick={logout} size="sm" variant="ghost" className="rounded-sm text-muted-foreground gap-2">
            <Icon name="LogOut" size={16} /> Выйти
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
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
            <Button onClick={openNew} className="bg-accent text-accent-foreground rounded-sm">Добавить произведение</Button>
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
                  <tr key={w.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-5 py-4">
                      <p className="font-serif text-base">{w.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{w.excerpt}</p>
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
                        <button onClick={() => openEdit(w)} className="text-muted-foreground hover:text-foreground transition-colors">
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
      </div>

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
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                    className="w-full rounded-sm border border-border bg-card px-3 py-2 text-sm"
                  >
                    {GENRES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Время чтения (например: 5 мин)</label>
                  <Input
                    value={form.read_time}
                    onChange={(e) => setForm({ ...form, read_time: e.target.value })}
                    placeholder="5 мин"
                    className="rounded-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Название</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Название произведения"
                  className="rounded-sm"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Краткое описание (анонс)</label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  placeholder="Несколько строк для привлечения внимания…"
                  rows={3}
                  className="rounded-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Полный текст</label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Введите полный текст произведения…"
                  rows={10}
                  className="rounded-sm resize-y font-serif text-base leading-relaxed"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Ссылка на аудио (необязательно)</label>
                <Input
                  value={form.audio_url}
                  onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
                  placeholder="https://…"
                  className="rounded-sm"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm">Опубликовать (видно читателям)</span>
              </label>
            </div>
            <div className="px-6 py-5 border-t border-border flex gap-3 justify-end">
              <Button onClick={() => setShowForm(false)} variant="outline" className="rounded-sm">Отмена</Button>
              <Button onClick={save} disabled={saving || !form.title.trim()} className="bg-accent text-accent-foreground rounded-sm gap-2">
                {saving ? <><Icon name="Loader" size={16} className="animate-spin" /> Сохраняю…</> : <><Icon name="Check" size={16} /> Сохранить</>}
              </Button>
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
              <Button onClick={confirmDelete} className="flex-1 bg-destructive text-destructive-foreground rounded-sm">Удалить</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
