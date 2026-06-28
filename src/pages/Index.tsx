import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const WORKS_URL = 'https://functions.poehali.dev/97e50fe2-d8c6-47a8-86fc-bbb58aeb0192';
const VISITS_URL = WORKS_URL + '?action=visit';
const SUBSCRIBE_URL = 'https://functions.poehali.dev/8d276d34-4f3a-4d3d-bf15-b95bbcccce2a';
const COMMENTS_URL = 'https://functions.poehali.dev/20b2c93c-b071-4d5c-854e-a1e7805084bf';

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

const HERO_IMG =
  'https://cdn.poehali.dev/projects/61cdedb7-3080-4183-a0bf-068105a36818/files/252b1522-46f8-42ce-9c4c-67c003f59c33.jpg';

const NAV = [
  { id: 'home', label: 'Главная' },
  { id: 'works', label: 'Произведения' },
  { id: 'books', label: 'Мои книги' },
  { id: 'board', label: 'Объявления' },
  { id: 'gallery', label: 'Галерея' },
  { id: 'about', label: 'Об авторе' },
  { id: 'contacts', label: 'Контакты' },
];

const GENRES_DEFAULT = [
  { key: 'Стихи', icon: 'Feather', desc: 'Рифмы и верлибры о любви, времени и тишине' },
  { key: 'Рассказы', icon: 'BookOpen', desc: 'Короткие истории с неожиданным дыханием' },
  { key: 'Фантазии', icon: 'Sparkles', desc: 'Миры на грани сна и реальности' },
  { key: 'Эссе', icon: 'PenLine', desc: 'Размышления о слове, искусстве и человеке' },
  { key: 'Статьи', icon: 'Newspaper', desc: 'Интервью, критика, обзоры' },
  { key: 'Разное', icon: 'Shuffle', desc: 'Афоризмы, экспериментальная поэзия и другие жанры' },
];



const CONTENT_URL = WORKS_URL + '?action=content';

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function Index() {
  const navigate = useNavigate();
  const [activeGenre, setActiveGenre] = useState('Все');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [worksLoading, setWorksLoading] = useState(true);
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});
  const [books, setBooks] = useState<{title:string;year:string;type:string;status:string;cover:string;link:string}[]>([]);
  const [announcements, setAnnouncements] = useState<{date:string;tag:string;text:string}[]>([]);
  const [articles, setArticles] = useState<{title:string;source:string;date:string;tag:string;url:string;image:string}[]>([]);
  const [gallery, setGallery] = useState<{type:'photo'|'video';url:string;caption:string}[]>([]);
  const [subEmail, setSubEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle'|'loading'|'ok'|'already'|'error'>('idle');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<{url: string; caption: string} | null>(null);
  const [genres, setGenres] = useState(GENRES_DEFAULT);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      fetch(VISITS_URL, { method: 'POST' }).catch(() => {});
    }
    fetch(WORKS_URL)
      .then((r) => r.json())
      .then((data: Work[]) => setWorks(data.filter((w) => w.published)))
      .finally(() => setWorksLoading(false));
    fetch(COMMENTS_URL)
      .then((r) => r.json())
      .then((data: Record<string, number>) => setCommentCounts(data))
      .catch(() => {});
    fetch(CONTENT_URL)
      .then((r) => r.json())
      .then((data) => {
        setSiteContent(data);
        try { setBooks(JSON.parse(data.books || '[]')); } catch { setBooks([]); }
        try { setAnnouncements(JSON.parse(data.announcements || '[]')); } catch { setAnnouncements([]); }
        try { setArticles(JSON.parse(data.articles || '[]')); } catch { setArticles([]); }
        try { setGallery(JSON.parse(data.gallery || '[]')); } catch { setGallery([]); }
        try {
          const saved = JSON.parse(data.genres || '[]');
          if (saved.length === 6) setGenres(saved);
        } catch { /* используем дефолт */ }
      });
  }, []);

  const genreCount = (key: string) => {
    const map: Record<string, string> = { 'Рассказы': 'Рассказ', 'Фантазии': 'Фантазия' };
    return works.filter((w) => w.genre === (map[key] || key)).length;
  };

  const filtered = works.filter((w) => {
    const map: Record<string, string> = { 'Рассказы': 'Рассказ', 'Фантазии': 'Фантазия' };
    const byGenre = activeGenre === 'Все' || w.genre === (map[activeGenre] || activeGenre);
    const byQuery = (w.title + w.excerpt).toLowerCase().includes(query.toLowerCase());
    return byGenre && byQuery;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent/20">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo('home')} className="font-serif text-2xl tracking-tight italic">
            Пространство <span className="text-accent">&</span> слова
          </button>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="ink-underline text-muted-foreground hover:text-foreground transition-colors">
                {n.label}
              </button>
            ))}
          </nav>
          <button className="md:hidden" onClick={() => setMenuOpen((v) => !v)}>
            <Icon name={menuOpen ? 'X' : 'Menu'} size={24} />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-3 animate-fade-in">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => { scrollTo(n.id); setMenuOpen(false); }} className="text-left text-muted-foreground py-1">
                {n.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="home" className="hero-dark relative pt-16 min-h-screen flex items-stretch overflow-hidden paper-grain">

        {/* Пользовательский фон */}
        {siteContent.hero_bg && (
          <div className="absolute inset-0">
            <img src={siteContent.hero_bg} alt="" className="w-full h-full object-cover opacity-15" />
          </div>
        )}

        {/* Тонкая линия сверху */}
        <div className="absolute top-16 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

        {/* Каллиграфическая надпись по центру */}
        <div className="absolute top-16 inset-x-0 z-20 flex flex-col items-center pt-6 pointer-events-none select-none px-4">
          {/* Вензель */}
          <svg width="260" height="36" viewBox="0 0 260 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-1 opacity-80">
            {/* Левая линия */}
            <line x1="0" y1="18" x2="95" y2="18" stroke="hsl(38 25% 65%)" strokeWidth="0.8"/>
            {/* Правая линия */}
            <line x1="165" y1="18" x2="260" y2="18" stroke="hsl(38 25% 65%)" strokeWidth="0.8"/>
            {/* Левый ромб-маркер */}
            <polygon points="97,18 103,13 109,18 103,23" fill="none" stroke="hsl(38 55% 55%)" strokeWidth="0.9"/>
            {/* Правый ромб-маркер */}
            <polygon points="151,18 157,13 163,18 157,23" fill="none" stroke="hsl(38 55% 55%)" strokeWidth="0.9"/>
            {/* Центральный орнамент — завиток */}
            <g transform="translate(130,18)">
              {/* Центральный ромб */}
              <polygon points="0,-7 5,0 0,7 -5,0" fill="hsl(38 55% 55%)" opacity="0.9"/>
              {/* Верхние усы */}
              <path d="M-5,-3 C-14,-3 -18,-10 -12,-12 C-8,-13 -8,-9 -12,-9" stroke="hsl(38 45% 58%)" strokeWidth="0.9" fill="none"/>
              <path d="M5,-3 C14,-3 18,-10 12,-12 C8,-13 8,-9 12,-9" stroke="hsl(38 45% 58%)" strokeWidth="0.9" fill="none"/>
              {/* Нижние усы */}
              <path d="M-5,3 C-14,3 -18,10 -12,12 C-8,13 -8,9 -12,9" stroke="hsl(38 45% 58%)" strokeWidth="0.9" fill="none"/>
              <path d="M5,3 C14,3 18,10 12,12 C8,13 8,9 12,9" stroke="hsl(38 45% 58%)" strokeWidth="0.9" fill="none"/>
              {/* Маленькие точки */}
              <circle cx="-20" cy="0" r="1.2" fill="hsl(38 55% 55%)"/>
              <circle cx="20" cy="0" r="1.2" fill="hsl(38 55% 55%)"/>
            </g>
          </svg>

          {/* Имя */}
          <p
            className="animate-fade-in"
            style={{
              fontFamily: "'Forum', serif",
              fontSize: 'clamp(2rem, 5vw, 3.8rem)',
              color: 'hsl(38 20% 84%)',
              textShadow: '0 2px 24px hsl(25 22% 6% / 0.85), 0 0 80px hsl(25 22% 6% / 0.5)',
              lineHeight: 1.1,
              letterSpacing: '0.04em',
              fontStyle: 'italic',
            }}
          >
            Алексей Ушаков
          </p>

          {/* Подпись под именем */}
          <p
            className="mt-2 tracking-[0.45em] animate-fade-in"
            style={{
              fontFamily: "'Oranienbaum', serif",
              fontSize: '1rem',
              fontVariant: 'small-caps',
              color: 'hsl(38 20% 55%)',
              letterSpacing: '0.4em',
              animationDelay: '0.2s',
            }}
          >
            Авторский сайт
          </p>
        </div>

        <div className="relative w-full flex flex-col md:flex-row min-h-screen">

          {/* Левая часть — текст */}
          <div className="flex flex-col justify-center px-8 md:px-16 lg:px-28 py-32 md:py-24 w-full md:w-[55%] z-10">

            {/* Метка */}
            <div className="flex items-center gap-4 mb-10 animate-fade-in">
              <span className="w-10 h-px bg-accent block shrink-0" />
              <p className="text-accent uppercase tracking-[0.35em] text-xs">
                {siteContent.hero_label || 'Литературный дневник'}
              </p>
            </div>

            {/* Заголовок */}
            <h1 className="animate-fade-up font-serif text-5xl sm:text-6xl lg:text-[5.5rem] leading-[0.9] tracking-tight mb-10" style={{color: 'hsl(38 25% 88%)'}}>
              {(siteContent.hero_title || 'Слова, которым\nнужна тишина').split('\n').map((line, i) => (
                <span key={i} className="block">
                  {i === 1 ? <em className="not-italic" style={{color: 'hsl(38 65% 60%)'}}>{line}</em> : line}
                </span>
              ))}
            </h1>

            {/* Разделитель */}
            <div className="w-12 h-px mb-8 animate-fade-in" style={{animationDelay: '0.2s', background: 'hsl(38 65% 48% / 0.5)'}} />

            {/* Подзаголовок */}
            <p className="animate-fade-up text-base leading-relaxed mb-12 max-w-[26rem] whitespace-pre-line" style={{ animationDelay: '0.25s', opacity: 0, color: 'hsl(38 15% 65%)' }}>
              {siteContent.hero_subtitle || 'Здесь живут мои стихи, рассказы, фантазии и эссе. Заходите без спешки — лучшее читается медленно.'}
            </p>

            {/* Кнопки */}
            <div className="animate-fade-up flex flex-wrap gap-4" style={{ animationDelay: '0.4s', opacity: 0 }}>
              <button
                onClick={() => scrollTo('works')}
                className="px-8 py-3 text-sm uppercase tracking-widest border transition-all duration-300"
                style={{borderColor: 'hsl(38 65% 48%)', color: 'hsl(38 65% 60%)'}}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'hsl(38 65% 48%)'; b.style.color = 'hsl(25 22% 12%)'; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.color = 'hsl(38 65% 60%)'; }}
              >
                Читать произведения
              </button>
              <button
                onClick={() => scrollTo('about')}
                className="px-8 py-3 text-sm uppercase tracking-widest border transition-all duration-300"
                style={{borderColor: 'hsl(38 10% 38%)', color: 'hsl(38 15% 65%)'}}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'hsl(38 15% 58%)'; b.style.color = 'hsl(38 25% 88%)'; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'hsl(38 10% 38%)'; b.style.color = 'hsl(38 15% 65%)'; }}
              >
                Об авторе
              </button>
            </div>
          </div>

          {/* Правая часть — фото автора */}
          <div className="hidden md:block md:w-[45%] relative">
            {(siteContent.hero_photo || siteContent.author_photo) ? (
              <>
                <img
                  src={siteContent.hero_photo || siteContent.author_photo}
                  alt="Автор"
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0" style={{background: 'linear-gradient(to right, hsl(25 22% 16%), hsl(25 22% 16% / 0.1) 50%, transparent)'}} />
                <div className="absolute inset-0" style={{background: 'linear-gradient(to top, hsl(25 22% 16% / 0.6), transparent)'}} />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{background: 'hsl(25 22% 12%)'}}>
                <div className="w-64 h-80 border relative flex items-center justify-center" style={{borderColor: 'hsl(38 30% 22%)'}}>
                  <div className="absolute -top-px -left-px w-8 h-8 border-t border-l" style={{borderColor: 'hsl(38 65% 48%)'}} />
                  <div className="absolute -top-px -right-px w-8 h-8 border-t border-r" style={{borderColor: 'hsl(38 65% 48%)'}} />
                  <div className="absolute -bottom-px -left-px w-8 h-8 border-b border-l" style={{borderColor: 'hsl(38 65% 48%)'}} />
                  <div className="absolute -bottom-px -right-px w-8 h-8 border-b border-r" style={{borderColor: 'hsl(38 65% 48%)'}} />
                  <div className="text-center" style={{color: 'hsl(38 20% 28%)'}}>
                    <Icon name="User" size={48} />
                    <p className="mt-4 text-xs uppercase tracking-widest">Ваше фото</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Стрелка вниз */}
        <button onClick={() => scrollTo('works')} className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in z-10 text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors">
          <Icon name="ChevronDown" size={24} />
        </button>

        {/* Тонкая линия снизу */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </section>

      {/* WORKS */}
      <section id="works" className="max-w-[1600px] mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Архив</p>
            <h2 className="font-serif text-4xl sm:text-5xl">Произведения</h2>
          </div>
          <div className="relative w-full md:w-72">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по текстам…"
              className="pl-10 rounded-sm bg-card border-border"
            />
          </div>
        </div>

        {/* genre cards */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-14">
          {genres.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGenre(activeGenre === g.key ? 'Все' : g.key)}
              className={`group text-left paper-grain p-4 rounded-sm border transition-all duration-300 ${
                activeGenre === g.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-accent/60'
              }`}
            >
              <Icon name={g.icon} size={22} className={`mb-2 ${activeGenre === g.key ? 'text-primary-foreground' : 'text-accent'}`} />
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-serif text-lg leading-tight">{g.key}</h3>
                <span className={`text-xs ml-1 ${activeGenre === g.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{genreCount(g.key)}</span>
              </div>
              <p className={`text-xs leading-relaxed hidden sm:block ${activeGenre === g.key ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{g.desc}</p>
            </button>
          ))}
        </div>

        {/* works list */}
        <div className="border-t border-border">
          {worksLoading && (
            <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
              <Icon name="Loader" size={28} className="animate-spin" />
              <p className="font-serif italic text-xl">Листаю страницы…</p>
            </div>
          )}
          {!worksLoading && filtered.length === 0 && (
            <p className="py-16 text-center text-muted-foreground font-serif text-2xl italic">Ничего не найдено…</p>
          )}
          <div className="grid md:grid-cols-2 gap-x-16">
          {!worksLoading && filtered.map((w) => (
            <article key={w.id} onClick={() => navigate(`/work/${w.id}`)} className="group py-6 border-b border-border hover:bg-card/60 transition-colors px-2 -mx-2 rounded-sm cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-accent uppercase tracking-widest text-xs">{w.genre}</span>
                <span className="text-muted-foreground text-xs">{new Date(w.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="text-muted-foreground text-xs flex items-center gap-1 ml-auto">
                  <Icon name="MessageCircle" size={12} />
                  {commentCounts[String(w.id)] || 0}
                </span>
                {w.read_time && <span className="text-muted-foreground text-xs flex items-center gap-1"><Icon name="Clock" size={12} />{w.read_time}</span>}
              </div>
              <h3 className="font-serif text-xl sm:text-2xl mb-2 group-hover:text-accent transition-colors">{w.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {w.excerpt.split(/(\[color:[^\]]+\].*?\[\/color\])/g).map((part, j) => {
                  const m = part.match(/^\[color:([^\]]+)\](.*)\[\/color\]$/s);
                  if (m) return <span key={j} style={{ color: m[1] }}>{m[2]}</span>;
                  return <span key={j}>{part}</span>;
                })}
              </p>
            </article>
          ))}
          </div>
        </div>
      </section>

      {/* BOOKS */}
      <section id="books" className="bg-primary text-primary-foreground py-24 paper-grain">
        <div className="max-w-[1600px] mx-auto px-6">
          <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Издано</p>
          <h2 className="font-serif text-4xl sm:text-5xl mb-4">Мои книги</h2>
          {siteContent.books_desc && (
            <p className="text-primary-foreground/70 text-lg leading-relaxed mb-14 max-w-5xl whitespace-pre-line">{siteContent.books_desc}</p>
          )}
          {!siteContent.books_desc && <div className="mb-14" />}
          <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((b, i) => (
              <div key={i} className="group relative bg-primary-foreground/5 border border-primary-foreground/15 rounded-sm hover:bg-primary-foreground/10 transition-colors overflow-hidden">
                {b.cover ? (
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={b.cover} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center aspect-[3/4] bg-primary-foreground/5">
                    <Icon name="BookMarked" size={48} className="text-accent opacity-40" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-serif text-2xl">{b.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ml-2 mt-1 ${b.status === 'В продаже' ? 'border-accent text-accent' : 'border-primary-foreground/30 text-primary-foreground/60'}`}>{b.status}</span>
                  </div>
                  <p className="text-primary-foreground/60 text-sm">{b.type} · {b.year}</p>
                  {b.link && <a href={b.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-accent underline">Купить →</a>}
                </div>
              </div>
            ))}
            {books.length === 0 && <p className="text-primary-foreground/50 col-span-5 text-center py-8">Книги пока не добавлены</p>}
          </div>
        </div>
      </section>

      {/* BOARD */}
      <section id="board" className="max-w-7xl mx-auto px-6 py-24">
        <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Что нового</p>
        <h2 className="font-serif text-4xl sm:text-5xl mb-14">Доска объявлений</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {announcements.map((b, i) => (
            <div key={i} className="paper-grain bg-card border border-border rounded-sm p-7 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs uppercase tracking-widest text-accent">{b.tag}</span>
                <span className="text-xs text-muted-foreground">{b.date}</span>
              </div>
              <p className="leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="bg-primary text-primary-foreground py-24 paper-grain">
        <div className="max-w-6xl mx-auto px-6 mb-14">
          <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Вдохновение</p>
          <h2 className="font-serif text-4xl sm:text-5xl mb-3">Галерея</h2>
          <p className="text-primary-foreground/60 text-lg leading-relaxed max-w-2xl">
            {siteContent.gallery_desc || 'Любимые фото и видео сюжеты, вдохновляющие мою музу'}
          </p>
        </div>
        <div className="px-6">
          {gallery.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {gallery.map((item, i) => (
                item.type === 'photo' ? (
                  <button
                    key={i}
                    onClick={() => setLightbox({ url: item.url, caption: item.caption })}
                    className="group relative aspect-square overflow-hidden rounded-sm border border-primary-foreground/20 hover:border-accent transition-colors"
                  >
                    <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </button>
                ) : (
                  <div key={i} className="col-span-2 row-span-2 aspect-video rounded-sm overflow-hidden border border-primary-foreground/20">
                    <iframe
                      src={item.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )
              ))}
            </div>
          ) : (
            <p className="text-primary-foreground/50 italic px-6">Фото и видео появятся здесь.</p>
          )}
        </div>

        {/* LIGHTBOX */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white"
              onClick={() => setLightbox(null)}
            >
              <Icon name="X" size={32} />
            </button>
            <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex flex-col items-center justify-center gap-3">
              <img src={lightbox.url} alt={lightbox.caption} className="max-w-full max-h-[88vh] w-auto h-auto object-contain" />
              {lightbox.caption && (
                <p className="text-white/70 italic text-sm text-center">{lightbox.caption}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-secondary/40 py-24 paper-grain">
        <div className="max-w-[1600px] mx-auto px-6 grid md:grid-cols-2 gap-16 items-start">
          <div className="relative">
            <div className="aspect-[4/5] rounded-sm overflow-hidden border border-border">
              <img src={siteContent.author_photo || HERO_IMG} alt="Автор за работой" className="w-full h-full object-cover" />
            </div>
            {(siteContent.about_since) && (
              <div className="absolute -bottom-5 -right-5 bg-accent text-accent-foreground font-serif italic text-xl px-6 py-3 rounded-sm shadow-lg">
                {siteContent.about_since}
              </div>
            )}
          </div>
          <div>
            <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Об авторе</p>
            <h2 className="font-serif text-4xl sm:text-5xl mb-8">Я пишу, чтобы<br /><span className="italic">расслышать мир</span></h2>
            <p className="drop-cap text-lg text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">
              {siteContent.author_bio || 'Расскажите о себе в разделе «Настройки сайта».'}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Статистика</p>
            <div className="flex gap-8 flex-wrap">
              {[
                [siteContent.stat1_num || '250+', siteContent.stat1_label || 'произведений'],
                [siteContent.stat2_num || '3', siteContent.stat2_label || 'книги'],
                [siteContent.stat3_num || '14 лет', siteContent.stat3_label || 'в литературе'],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-serif text-3xl text-accent">{n}</p>
                  <p className="text-sm text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SUBSCRIBE */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <Icon name="Mail" size={36} className="text-accent mx-auto mb-6" />
        <h2 className="font-serif text-4xl sm:text-5xl mb-4">Подписка на новое</h2>
        <p className="text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
          Оставьте почту — и я пришлю весточку, когда появится новое стихотворение, рассказ или книга. Не чаще раза в месяц, обещаю.
        </p>
        {subStatus === 'ok' && (
          <p className="text-accent font-serif text-xl">Спасибо! Письмо-подтверждение уже летит к вам.</p>
        )}
        {subStatus === 'already' && (
          <p className="text-muted-foreground font-serif text-xl">Вы уже подписаны — письма придут при выходе новинок.</p>
        )}
        {subStatus !== 'ok' && subStatus !== 'already' && (
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubStatus('loading');
              try {
                const res = await fetch(SUBSCRIBE_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: subEmail }),
                });
                const data = await res.json();
                if (data.status === 'already_subscribed') setSubStatus('already');
                else if (res.ok) setSubStatus('ok');
                else setSubStatus('error');
              } catch {
                setSubStatus('error');
              }
            }}
          >
            <Input
              type="email"
              placeholder="ваша почта"
              className="rounded-sm bg-card border-border"
              value={subEmail}
              onChange={(e) => setSubEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={subStatus === 'loading'} className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-sm px-8 whitespace-nowrap">
              {subStatus === 'loading' ? 'Отправляю…' : 'Подписаться'}
            </Button>
          </form>
        )}
        {subStatus === 'error' && (
          <p className="text-destructive text-sm mt-3">Что-то пошло не так. Попробуйте ещё раз.</p>
        )}
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="bg-primary text-primary-foreground py-24 paper-grain">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          <div>
            <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Связаться</p>
            <h2 className="font-serif text-4xl sm:text-5xl mb-8">Напишите мне</h2>
            <p className="text-primary-foreground/70 leading-relaxed mb-10 max-w-md">
              Отклик о прочитанном, приглашение на встречу или просто доброе слово — я читаю каждое письмо.
            </p>
            <div className="space-y-5">
              {[
                ['Mail', siteContent.contacts_email],
                ['Send', siteContent.contacts_social],
                ['MessageSquare', siteContent.contacts_text],
              ].filter(([, val]) => val).map(([icon, val]) => (
                <div key={val} className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-sm bg-primary-foreground/10 flex items-center justify-center text-accent">
                    <Icon name={icon as string} size={20} />
                  </div>
                  <span className="text-primary-foreground/90">{val}</span>
                </div>
              ))}
              {siteContent.contacts_phone && (
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-sm bg-primary-foreground/10 flex items-center justify-center text-accent">
                    <Icon name="Phone" size={20} />
                  </div>
                  <span className="text-primary-foreground/90">{siteContent.contacts_phone}</span>
                </div>
              )}
            </div>
          </div>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const name = (f.elements.namedItem('name') as HTMLInputElement).value;
            const email = (f.elements.namedItem('email') as HTMLInputElement).value;
            const message = (f.elements.namedItem('message') as HTMLTextAreaElement).value;
            const btn = f.querySelector('button[type="submit"]') as HTMLButtonElement;
            btn.disabled = true;
            btn.textContent = 'Отправляю…';
            try {
              const res = await fetch(WORKS_URL + '?action=contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message }),
              });
              if (res.ok) {
                btn.textContent = 'Отправлено!';
                f.reset();
              } else {
                btn.textContent = 'Ошибка, попробуйте ещё раз';
                btn.disabled = false;
              }
            } catch {
              btn.textContent = 'Ошибка, попробуйте ещё раз';
              btn.disabled = false;
            }
          }}>
            <Input name="name" placeholder="Ваше имя" required className="rounded-sm bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40" />
            <Input name="email" type="email" placeholder="Почта для ответа" required className="rounded-sm bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40" />
            <Textarea name="message" placeholder="Ваше сообщение…" rows={5} required className="rounded-sm bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 resize-none" />
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-sm">
              Отправить письмо
            </Button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="font-serif italic text-lg">{siteContent.footer_title || 'Чернила & тишина'}</p>
          <p className="max-w-xs text-left whitespace-pre-line">© {new Date().getFullYear()} · {siteContent.footer_rights || 'Все права на тексты принадлежат автору'}</p>
          <a href="https://www.liveinternet.ru/stat/notstandard-project.ru/" target="_blank" rel="noopener noreferrer">
            <img
              src="https://counter.yadro.ru/hit;notstandard-project.ru?t52"
              alt="LiveInternet"
              style={{ border: 'none', width: 88, height: 31 }}
            />
          </a>
        </div>
      </footer>
    </div>
  );
}