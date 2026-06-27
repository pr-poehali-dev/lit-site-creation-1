import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

const WORKS_URL = 'https://functions.poehali.dev/97e50fe2-d8c6-47a8-86fc-bbb58aeb0192';
const AUTH_URL = 'https://functions.poehali.dev/04d359cd-5265-40e8-8b22-c336a2d73de4';
const VISITS_URL = WORKS_URL + '?action=visits';
const UPLOAD_URL = WORKS_URL + '?action=upload';

const GENRES = ['Стихи', 'Рассказ', 'Фантазия', 'Эссе', 'Статьи', 'Разное'];

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

const emptyForm = (): Omit<Work, 'id' | 'created_at'> => ({
  genre: 'Стихи',
  title: '',
  excerpt: '',
  body: '',
  audio_url: '',
  image_url: '',
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
  const [visits, setVisits] = useState<{ today: number; total: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const excerptRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<'works' | 'settings'>('works');
  const [content, setContent] = useState<Record<string, string>>({});
  const [contentSaving, setContentSaving] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);
  const [books, setBooks] = useState<{title:string;year:string;type:string;status:string;cover:string;link:string}[]>([]);
  const [announcements, setAnnouncements] = useState<{date:string;tag:string;text:string}[]>([]);
  const [articles, setArticles] = useState<{title:string;source:string;date:string;tag:string;url:string;image:string}[]>([]);
  const [gallery, setGallery] = useState<{type:'photo'|'video';url:string;caption:string}[]>([]);
  const [genres, setGenres] = useState([
    { key: 'Стихи', icon: 'Feather', desc: 'Рифмы и верлибры о любви, времени и тишине' },
    { key: 'Рассказы', icon: 'BookOpen', desc: 'Короткие истории с неожиданным дыханием' },
    { key: 'Фантазии', icon: 'Sparkles', desc: 'Миры на грани сна и реальности' },
    { key: 'Эссе', icon: 'PenLine', desc: 'Размышления о слове, искусстве и человеке' },
    { key: 'Статьи', icon: 'Newspaper', desc: 'Интервью, критика, обзоры' },
    { key: 'Разное', icon: 'Shuffle', desc: 'Афоризмы, экспериментальная поэзия и другие жанры' },
  ]);
  const dragIndexRef = useRef<number | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState<number | null>(null);
  const [articleImgUploading, setArticleImgUploading] = useState<number | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const isLoggedIn = !!token;

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
    setForm({ ...form, body: newBody });
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
      fetchVisits(data.token);
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

  const fetchVisits = (t: string) => {
    fetch(VISITS_URL, { headers: { 'X-Auth-Token': t } })
      .then((r) => { console.log('visits status', r.status); return r.ok ? r.json() : null; })
      .then((data) => { console.log('visits data', data); if (data && 'today' in data) setVisits(data); });
  };

  const fetchContent = () => {
    fetch(WORKS_URL + '?action=content')
      .then((r) => r.json())
      .then((data) => {
        setContent(data);
        try { setBooks(JSON.parse(data.books || '[]')); } catch { setBooks([]); }
        try { setAnnouncements(JSON.parse(data.announcements || '[]')); } catch { setAnnouncements([]); }
        try { setArticles(JSON.parse(data.articles || '[]')); } catch { setArticles([]); }
        try { setGallery(JSON.parse(data.gallery || '[]')); } catch { setGallery([]); }
        try { const g = JSON.parse(data.genres || '[]'); if (g.length === 6) setGenres(g); } catch { /* дефолт */ }
      });
  };

  const saveContent = async (extra?: Record<string, string>) => {
    setContentSaving(true);
    const payload = { ...content, ...extra, books: JSON.stringify(books), announcements: JSON.stringify(announcements), articles: JSON.stringify(articles), gallery: JSON.stringify(gallery), genres: JSON.stringify(genres) };
    await fetch(WORKS_URL + '?action=content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify(payload),
    });
    setContentSaving(false);
    setContentSaved(true);
    setTimeout(() => setContentSaved(false), 2000);
  };

  const compressImage = (file: File, maxWidth = 1600, quality = 0.85): Promise<string> =>
    new Promise((resolve) => {
      setUploadProgress('Читаю файл…');
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        setUploadProgress('Сжимаю изображение…');
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = url;
    });

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true);
    const compressed = await compressImage(file);
    setUploadProgress('Загружаю на сервер…');
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ file: compressed }),
    });
    const data = await res.json();
    if (data.url) setContent((c) => ({ ...c, author_photo: data.url }));
    setPhotoUploading(false);
    setUploadProgress(null);
  };

  const uploadCover = async (file: File, idx: number) => {
    setCoverUploading(idx);
    const compressed = await compressImage(file);
    const res = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token }, body: JSON.stringify({ file: compressed }) });
    const data = await res.json();
    if (data.url) setBooks((arr) => arr.map((x, j) => j === idx ? { ...x, cover: data.url } : x));
    setCoverUploading(null);
  };

  const uploadArticleImg = async (file: File, idx: number) => {
    setArticleImgUploading(idx);
    const compressed = await compressImage(file);
    const res = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token }, body: JSON.stringify({ file: compressed }) });
    const data = await res.json();
    if (data.url) setArticles((arr) => arr.map((x, j) => j === idx ? { ...x, image: data.url } : x));
    setArticleImgUploading(null);
  };

  const uploadGalleryPhoto = async (file: File) => {
    setGalleryUploading(true);
    const compressed = await compressImage(file);
    const res = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token }, body: JSON.stringify({ file: compressed }) });
    const data = await res.json();
    if (data.url) setGallery((arr) => [...arr, { type: 'photo', url: data.url, caption: '' }]);
    setGalleryUploading(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchWorks();
      fetchVisits(token);
      fetchContent();
    }
  }, [isLoggedIn]);

  const handleDrop = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const reordered = [...works];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOver.current, 0, moved);
    dragItem.current = null;
    dragOver.current = null;
    setWorks(reordered);
    fetch(WORKS_URL + '?action=reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ ids: reordered.map((w) => w.id) }),
    });
  };

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
      image_url: w.image_url || '',
      read_time: w.read_time,
      published: w.published,
    });
    setEditId(w.id);
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const compressed = await compressImage(file);
    setUploadProgress('Загружаю на сервер…');
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ file: compressed }),
    });
    const data = await res.json();
    if (data.url) setForm((f) => ({ ...f, image_url: data.url }));
    setUploading(false);
    setUploadProgress(null);
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
          <p className="font-serif italic text-3xl text-center mb-2">Пространство <span className="text-accent">&</span> слова</p>
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
          <a href="/" className="font-serif italic text-xl">Пространство <span className="text-accent">&</span> слова</a>
          <span className="text-muted-foreground text-sm hidden sm:block">/ Панель автора </span>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'works' && (
            <Button onClick={openNew} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-sm gap-2">
              <Icon name="Plus" size={16} /> Новое произведение
            </Button>
          )}
          <Button onClick={logout} size="sm" variant="ghost" className="rounded-sm text-muted-foreground gap-2">
            <Icon name="LogOut" size={16} /> Выйти
          </Button>
        </div>
      </header>

      {/* ВКЛАДКИ */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          <button onClick={() => setTab('works')} className={`px-4 py-3 text-sm border-b-2 transition-colors ${tab === 'works' ? 'border-accent text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            Произведения
          </button>
          <button onClick={() => setTab('settings')} className={`px-4 py-3 text-sm border-b-2 transition-colors ${tab === 'settings' ? 'border-accent text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            Настройки сайта
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* ===== НАСТРОЙКИ САЙТА ===== */}
        {tab === 'settings' && (
          <div className="space-y-10">

            {/* Главная страница */}
            <section className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h2 className="font-serif text-2xl mb-2">Главная страница</h2>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Подпись над заголовком (маленький текст)</label>
                <Input value={content.hero_label || ''} onChange={(e) => setContent((c) => ({ ...c, hero_label: e.target.value }))} className="rounded-sm" placeholder="Литературный дневник" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Главный заголовок</label>
                <Textarea rows={2} value={content.hero_title || ''} onChange={(e) => setContent((c) => ({ ...c, hero_title: e.target.value }))} className="rounded-sm resize-none" placeholder="Слова, которым нужна тишина…" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Подзаголовок</label>
                <Textarea rows={4} value={content.hero_subtitle || ''} onChange={(e) => setContent((c) => ({ ...c, hero_subtitle: e.target.value }))} className="rounded-sm" placeholder="Здесь живут мои стихи…" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Фото автора (правая половина экрана)</label>
                <div className="flex gap-3 items-center">
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-sm border border-border bg-background text-sm hover:bg-muted/40 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Icon name={uploading ? 'Loader' : 'ImageUp'} size={16} className={uploading ? 'animate-spin' : ''} />
                    {uploading ? 'Загружаю…' : 'Выбрать фото'}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      if (!e.target.files?.[0]) return;
                      setUploading(true);
                      const compressed = await compressImage(e.target.files[0]);
                      setUploadProgress('Загружаю на сервер…');
                      const res = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token }, body: JSON.stringify({ file: compressed }) });
                      const data = await res.json();
                      if (data.url) setContent((c) => ({ ...c, hero_photo: data.url }));
                      setUploading(false);
                      setUploadProgress(null);
                    }} />
                  </label>
                  {content.hero_photo && <img src={content.hero_photo} alt="Hero" className="h-16 w-12 rounded-sm object-cover border border-border" />}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Фоновое изображение (необязательно)</label>
                <div className="flex gap-3 items-center">
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-sm border border-border bg-background text-sm hover:bg-muted/40 transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Icon name={photoUploading ? 'Loader' : 'Image'} size={16} className={photoUploading ? 'animate-spin' : ''} />
                    {photoUploading ? 'Загружаю…' : 'Выбрать фон'}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      if (!e.target.files?.[0]) return;
                      setPhotoUploading(true);
                      const compressed = await compressImage(e.target.files[0], 2400, 0.85);
                      setUploadProgress('Загружаю на сервер…');
                      const res = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token }, body: JSON.stringify({ file: compressed }) });
                      const data = await res.json();
                      if (data.url) setContent((c) => ({ ...c, hero_bg: data.url }));
                      setPhotoUploading(false);
                      setUploadProgress(null);
                    }} />
                  </label>
                  {content.hero_bg && (
                    <div className="flex items-center gap-2">
                      <img src={content.hero_bg} alt="Фон" className="h-12 w-20 rounded-sm object-cover border border-border" />
                      <button onClick={() => setContent((c) => ({ ...c, hero_bg: '' }))} className="text-xs text-muted-foreground hover:text-destructive">Удалить</button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Об авторе */}
            <section className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h2 className="font-serif text-2xl mb-2">Об авторе</h2>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Имя автора</label>
                <Input value={content.author_name || ''} onChange={(e) => setContent((c) => ({ ...c, author_name: e.target.value }))} className="rounded-sm" placeholder="Имя Фамилия" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Биография</label>
                <Textarea rows={5} value={content.author_bio || ''} onChange={(e) => setContent((c) => ({ ...c, author_bio: e.target.value }))} className="rounded-sm" placeholder="Расскажите о себе…" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Фото автора</label>
                <div className="flex gap-3 items-center">
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-sm border border-border bg-background text-sm hover:bg-muted/40 transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Icon name={photoUploading ? 'Loader' : 'ImageUp'} size={16} className={photoUploading ? 'animate-spin' : ''} />
                    {photoUploading ? 'Загружаю…' : 'Выбрать фото'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                  </label>
                  {content.author_photo && <img src={content.author_photo} alt="Фото" className="h-12 w-12 rounded-full object-cover border border-border" />}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Подпись на фото (например: «с 2012 года»)</label>
                <Input value={content.about_since || ''} onChange={(e) => setContent((c) => ({ ...c, about_since: e.target.value }))} className="rounded-sm" placeholder="с 2012 года" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Статистика</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Цифра 1</label>
                    <Input value={content.stat1_num || ''} onChange={(e) => setContent((c) => ({ ...c, stat1_num: e.target.value }))} className="rounded-sm" placeholder="250+" />
                    <Input value={content.stat1_label || ''} onChange={(e) => setContent((c) => ({ ...c, stat1_label: e.target.value }))} className="rounded-sm mt-1" placeholder="произведений" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Цифра 2</label>
                    <Input value={content.stat2_num || ''} onChange={(e) => setContent((c) => ({ ...c, stat2_num: e.target.value }))} className="rounded-sm" placeholder="3" />
                    <Input value={content.stat2_label || ''} onChange={(e) => setContent((c) => ({ ...c, stat2_label: e.target.value }))} className="rounded-sm mt-1" placeholder="книги" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Цифра 3</label>
                    <Input value={content.stat3_num || ''} onChange={(e) => setContent((c) => ({ ...c, stat3_num: e.target.value }))} className="rounded-sm" placeholder="14 лет" />
                    <Input value={content.stat3_label || ''} onChange={(e) => setContent((c) => ({ ...c, stat3_label: e.target.value }))} className="rounded-sm mt-1" placeholder="в литературе" />
                  </div>
                </div>
              </div>
            </section>

            {/* Жанры */}
            <section className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h2 className="font-serif text-2xl mb-2">Жанры произведений</h2>
              <p className="text-sm text-muted-foreground">Названия и подписи шести квадратиков на странице «Произведения».</p>
              <div className="space-y-3">
                {genres.map((g, i) => (
                  <div key={i} className="grid sm:grid-cols-2 gap-3 p-3 border border-border rounded-sm">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Название жанра</label>
                      <Input value={g.key} onChange={(e) => setGenres((arr) => arr.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} className="rounded-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Описание под названием</label>
                      <Input value={g.desc} onChange={(e) => setGenres((arr) => arr.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} className="rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Контакты */}
            <section className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h2 className="font-serif text-2xl mb-2">Контакты</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
                  <Input value={content.contacts_email || ''} onChange={(e) => setContent((c) => ({ ...c, contacts_email: e.target.value }))} className="rounded-sm" placeholder="author@example.com" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Телефон</label>
                  <Input value={content.contacts_phone || ''} onChange={(e) => setContent((c) => ({ ...c, contacts_phone: e.target.value }))} className="rounded-sm" placeholder="+7 900 000-00-00" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Соцсети (ссылка или @username)</label>
                <Input value={content.contacts_social || ''} onChange={(e) => setContent((c) => ({ ...c, contacts_social: e.target.value }))} className="rounded-sm" placeholder="https://t.me/username" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Дополнительный текст</label>
                <Textarea rows={3} value={content.contacts_text || ''} onChange={(e) => setContent((c) => ({ ...c, contacts_text: e.target.value }))} className="rounded-sm" placeholder="Любой дополнительный текст в разделе контактов…" />
              </div>
            </section>

            {/* Объявления */}
            <section className="bg-card border border-border rounded-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Объявления</h2>
                <Button size="sm" variant="outline" className="rounded-sm gap-2" onClick={() => setAnnouncements((a) => [...a, { date: '', tag: '', text: '' }])}>
                  <Icon name="Plus" size={14} /> Добавить
                </Button>
              </div>
              {announcements.map((a, i) => (
                <div key={i} className="border border-border rounded-sm p-4 space-y-3 relative">
                  <button onClick={() => setAnnouncements((arr) => arr.filter((_, j) => j !== i))} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive">
                    <Icon name="X" size={16} />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Дата</label>
                      <Input value={a.date} onChange={(e) => setAnnouncements((arr) => arr.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} className="rounded-sm" placeholder="20 июня" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Тег</label>
                      <Input value={a.tag} onChange={(e) => setAnnouncements((arr) => arr.map((x, j) => j === i ? { ...x, tag: e.target.value } : x))} className="rounded-sm" placeholder="Встреча / Новинка" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Текст</label>
                    <Textarea rows={2} value={a.text} onChange={(e) => setAnnouncements((arr) => arr.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} className="rounded-sm resize-none" />
                  </div>
                </div>
              ))}
              {announcements.length === 0 && <p className="text-muted-foreground text-sm">Нет объявлений. Нажмите «Добавить».</p>}
            </section>

            {/* Мои книги */}
            <section className="bg-card border border-border rounded-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Мои книги</h2>
                <Button size="sm" variant="outline" className="rounded-sm gap-2" onClick={() => setBooks((b) => [...b, { title: '', year: '', type: '', status: 'В продаже', cover: '', link: '' }])}>
                  <Icon name="Plus" size={14} /> Добавить книгу
                </Button>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Текст / пояснение к разделу</label>
                <Textarea rows={3} value={content.books_desc || ''} onChange={(e) => setContent((c) => ({ ...c, books_desc: e.target.value }))} className="rounded-sm resize-none" placeholder="Напишите что-нибудь о своих книгах…" />
              </div>
              {books.map((b, i) => (
                <div key={i} className="border border-border rounded-sm p-4 space-y-3 relative">
                  <button onClick={() => setBooks((arr) => arr.filter((_, j) => j !== i))} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive">
                    <Icon name="X" size={16} />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Название</label>
                      <Input value={b.title} onChange={(e) => setBooks((arr) => arr.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className="rounded-sm" placeholder="Название книги" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Год</label>
                      <Input value={b.year} onChange={(e) => setBooks((arr) => arr.map((x, j) => j === i ? { ...x, year: e.target.value } : x))} className="rounded-sm" placeholder="2024" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
                      <Input value={b.type} onChange={(e) => setBooks((arr) => arr.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} className="rounded-sm" placeholder="Сборник стихов" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Статус</label>
                      <Input value={b.status} onChange={(e) => setBooks((arr) => arr.map((x, j) => j === i ? { ...x, status: e.target.value } : x))} className="rounded-sm" placeholder="В продаже / Готовится" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Ссылка на покупку (необязательно)</label>
                    <Input value={b.link} onChange={(e) => setBooks((arr) => arr.map((x, j) => j === i ? { ...x, link: e.target.value } : x))} className="rounded-sm" placeholder="https://…" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Фото обложки</label>
                    <div className="flex gap-3 items-center">
                      <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-sm border border-border bg-background text-xs hover:bg-muted/40 transition-colors ${coverUploading === i ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Icon name={coverUploading === i ? 'Loader' : 'ImageUp'} size={14} className={coverUploading === i ? 'animate-spin' : ''} />
                        {coverUploading === i ? 'Загружаю…' : 'Выбрать обложку'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0], i)} />
                      </label>
                      {b.cover && (
                        <>
                          <img src={b.cover} alt="Обложка" className="h-12 w-9 object-cover rounded-sm border border-border" />
                          <button onClick={() => setBooks((arr) => arr.map((x, j) => j === i ? { ...x, cover: '' } : x))} className="text-xs text-muted-foreground hover:text-destructive">Удалить</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {books.length === 0 && <p className="text-muted-foreground text-sm">Нет книг. Нажмите «Добавить книгу».</p>}
            </section>

            {/* Описание галереи — вынесено отдельно чтобы курсор не сбрасывался */}
            <section className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h2 className="font-serif text-2xl mb-2">Галерея — описание</h2>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Описание раздела</label>
                <Textarea rows={3} key={`gd_${!!content.gallery_desc}`} defaultValue={content.gallery_desc || ''} onBlur={(e) => setContent((c) => ({ ...c, gallery_desc: e.target.value }))} className="rounded-sm" placeholder="Любимые фото и видео, вдохновляющие мою музу." />
              </div>
            </section>

            {/* Галерея — фото и видео */}
            <section className="bg-card border border-border rounded-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Галерея — фото и видео</h2>
                <div className="flex gap-2">
                  <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-sm border border-border bg-background text-xs hover:bg-muted/40 transition-colors ${galleryUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Icon name={galleryUploading ? 'Loader' : 'ImagePlus'} size={14} className={galleryUploading ? 'animate-spin' : ''} />
                    {galleryUploading ? 'Загружаю…' : 'Добавить фото'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadGalleryPhoto(e.target.files[0])} />
                  </label>
                  <Button size="sm" variant="outline" className="rounded-sm gap-2 text-xs" onClick={() => setGallery((g) => [...g, { type: 'video', url: '', caption: '' }])}>
                    <Icon name="Video" size={14} /> Добавить видео
                  </Button>
                </div>
              </div>
              {gallery.map((item, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => { dragIndexRef.current = i; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const from = dragIndexRef.current;
                    if (from === null || from === i) return;
                    setGallery((arr) => {
                      const next = [...arr];
                      const [moved] = next.splice(from, 1);
                      next.splice(i, 0, moved);
                      return next;
                    });
                    dragIndexRef.current = null;
                  }}
                  className="border border-border rounded-sm p-3 flex gap-4 items-start relative cursor-grab active:cursor-grabbing active:opacity-50 transition-opacity"
                >
                  <div className="shrink-0 flex items-center text-muted-foreground pt-1">
                    <Icon name="GripVertical" size={16} />
                  </div>
                  <button onClick={() => setGallery((arr) => arr.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                    <Icon name="X" size={14} />
                  </button>
                  {item.type === 'photo' && item.url && (
                    <img src={item.url} alt="" className="h-16 w-20 object-cover rounded-sm border border-border shrink-0" />
                  )}
                  {item.type === 'video' && (
                    <div className="shrink-0 flex items-center justify-center w-20 h-16 bg-muted rounded-sm border border-border">
                      <Icon name="Video" size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    {item.type === 'video' && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Ссылка YouTube</label>
                        <Input value={item.url} onChange={(e) => setGallery((arr) => arr.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} className="rounded-sm text-xs" placeholder="https://youtube.com/watch?v=…" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Подпись (необязательно)</label>
                      <Input value={item.caption} onChange={(e) => setGallery((arr) => arr.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))} className="rounded-sm text-xs" placeholder="Описание фото или видео" />
                    </div>
                  </div>
                </div>
              ))}
              {gallery.length === 0 && <p className="text-muted-foreground text-sm">Нет материалов. Добавьте фото или видео.</p>}
            </section>

            <div className="flex justify-end">
              <Button onClick={() => saveContent()} disabled={contentSaving} className="bg-accent text-accent-foreground rounded-sm gap-2 px-8">
                {contentSaving ? <><Icon name="Loader" size={16} className="animate-spin" /> Сохраняю…</> : contentSaved ? <><Icon name="Check" size={16} /> Сохранено!</> : <><Icon name="Save" size={16} /> Сохранить все настройки</>}
              </Button>
            </div>
          </div>
        )}

        {/* ===== ПРОИЗВЕДЕНИЯ ===== */}
        {tab === 'works' && (
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
              onClick={() => {
                if (!confirm('Обнулить оба счётчика посещений?')) return;
                fetch(VISITS_URL, { method: 'DELETE', headers: { 'X-Auth-Token': token } })
                  .then(() => setVisits({ today: 0, total: 0 }));
              }}
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
                  <tr
                    key={w.id}
                    draggable
                    onDragStart={() => { dragItem.current = i; }}
                    onDragEnter={() => { dragOver.current = i; }}
                    onDragEnd={handleDrop}
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
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
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
                      onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
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
              <Button onClick={confirmDelete} className="flex-1 bg-destructive text-destructive-foreground rounded-sm">Удалить</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}