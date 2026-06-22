import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const WORKS_URL = 'https://functions.poehali.dev/97e50fe2-d8c6-47a8-86fc-bbb58aeb0192';

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
  { id: 'about', label: 'Об авторе' },
  { id: 'contacts', label: 'Контакты' },
];

const GENRES = [
  { key: 'Стихи', icon: 'Feather', count: 48, desc: 'Рифмы и верлибры о любви, времени и тишине' },
  { key: 'Рассказы', icon: 'BookOpen', count: 23, desc: 'Короткие истории с неожиданным дыханием' },
  { key: 'Фантазии', icon: 'Sparkles', count: 17, desc: 'Миры на грани сна и реальности' },
  { key: 'Эссе', icon: 'PenLine', count: 12, desc: 'Размышления о слове, искусстве и человеке' },
];



const BOOKS = [
  { title: 'Тихие комнаты', year: '2024', type: 'Сборник стихов', status: 'В продаже' },
  { title: 'Между строк', year: '2022', type: 'Рассказы и эссе', status: 'В продаже' },
  { title: 'Город из бумаги', year: '2026', type: 'Роман', status: 'Готовится' },
];

const BOARD = [
  { date: '20 июня', tag: 'Встреча', text: 'Творческий вечер в книжном клубе «Абзац» — читаю новые стихи и отвечаю на вопросы.' },
  { date: '5 июня', tag: 'Новинка', text: 'Опубликовал цикл «Сентябрьский свет» — четыре новых стихотворения в разделе Произведения.' },
  { date: '28 мая', tag: 'Конкурс', text: 'Открываю приём работ читателей на тему «Один тихий день». Лучшие опубликую на сайте.' },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function Index() {
  const [activeGenre, setActiveGenre] = useState('Все');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [worksLoading, setWorksLoading] = useState(true);

  useEffect(() => {
    fetch(WORKS_URL)
      .then((r) => r.json())
      .then((data: Work[]) => setWorks(data.filter((w) => w.published)))
      .finally(() => setWorksLoading(false));
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
            Чернила <span className="text-accent">&</span> тишина
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
      <section id="home" className="relative pt-16 min-h-screen flex items-center overflow-hidden paper-grain">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Письменный стол" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="max-w-2xl">
            <p className="animate-fade-in text-accent uppercase tracking-[0.3em] text-xs mb-6">Литературный дневник</p>
            <h1 className="animate-fade-up font-serif text-5xl sm:text-7xl leading-[0.95] mb-8">
              Слова, которым<br />нужна <span className="italic text-accent">тишина</span>,<br />чтобы прозвучать
            </h1>
            <p className="animate-fade-up text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg" style={{ animationDelay: '0.15s', opacity: 0 }}>
              Здесь живут мои стихи, рассказы, фантазии и эссе. Заходите без спешки — лучшее читается медленно.
            </p>
            <div className="animate-fade-up flex flex-wrap gap-4" style={{ animationDelay: '0.3s', opacity: 0 }}>
              <Button size="lg" onClick={() => scrollTo('works')} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm px-8">
                Читать произведения
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo('about')} className="rounded-sm border-foreground/20 px-8">
                Об авторе
              </Button>
            </div>
          </div>
        </div>
        <button onClick={() => scrollTo('works')} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground animate-fade-in">
          <Icon name="ChevronDown" size={28} />
        </button>
      </section>

      {/* WORKS */}
      <section id="works" className="max-w-6xl mx-auto px-6 py-24">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {GENRES.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGenre(activeGenre === g.key ? 'Все' : g.key)}
              className={`group text-left paper-grain p-6 rounded-sm border transition-all duration-300 ${
                activeGenre === g.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-accent/60'
              }`}
            >
              <Icon name={g.icon} size={28} className={`mb-4 ${activeGenre === g.key ? 'text-primary-foreground' : 'text-accent'}`} />
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-serif text-2xl">{g.key}</h3>
                <span className={`text-xs ${activeGenre === g.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{genreCount(g.key)}</span>
              </div>
              <p className={`text-sm leading-relaxed ${activeGenre === g.key ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{g.desc}</p>
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
          {!worksLoading && filtered.map((w) => (
            <article key={w.id} className="group grid md:grid-cols-[160px_1fr_auto] gap-4 md:gap-8 items-start py-8 border-b border-border hover:bg-card/60 transition-colors px-2 -mx-2 rounded-sm cursor-pointer">
              <div className="text-sm text-muted-foreground">
                <span className="text-accent uppercase tracking-widest text-xs">{w.genre}</span>
                <p className="mt-1">
                  {new Date(w.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl mb-3 group-hover:text-accent transition-colors">{w.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-2xl">{w.excerpt}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm whitespace-nowrap">
                {w.read_time && <><Icon name="Clock" size={15} /> {w.read_time}</>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* BOOKS */}
      <section id="books" className="bg-primary text-primary-foreground py-24 paper-grain">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Издано</p>
          <h2 className="font-serif text-4xl sm:text-5xl mb-14">Мои книги</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {BOOKS.map((b, i) => (
              <div key={i} className="group relative bg-primary-foreground/5 border border-primary-foreground/15 rounded-sm p-8 hover:bg-primary-foreground/10 transition-colors">
                <div className="flex items-start justify-between mb-8">
                  <Icon name="BookMarked" size={32} className="text-accent" />
                  <span className={`text-xs px-3 py-1 rounded-full border ${b.status === 'В продаже' ? 'border-accent text-accent' : 'border-primary-foreground/30 text-primary-foreground/60'}`}>{b.status}</span>
                </div>
                <h3 className="font-serif text-3xl mb-2">{b.title}</h3>
                <p className="text-primary-foreground/60 text-sm">{b.type} · {b.year}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOARD */}
      <section id="board" className="max-w-6xl mx-auto px-6 py-24">
        <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Что нового</p>
        <h2 className="font-serif text-4xl sm:text-5xl mb-14">Доска объявлений</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {BOARD.map((b, i) => (
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

      {/* ABOUT */}
      <section id="about" className="bg-secondary/40 py-24 paper-grain">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="aspect-[4/5] rounded-sm overflow-hidden border border-border">
              <img src={HERO_IMG} alt="Автор за работой" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-5 -right-5 bg-accent text-accent-foreground font-serif italic text-xl px-6 py-3 rounded-sm shadow-lg">
              с 2012 года
            </div>
          </div>
          <div>
            <p className="text-accent uppercase tracking-[0.3em] text-xs mb-3">Об авторе</p>
            <h2 className="font-serif text-4xl sm:text-5xl mb-8">Я пишу, чтобы<br /><span className="italic">расслышать мир</span></h2>
            <p className="drop-cap text-lg text-muted-foreground leading-relaxed mb-5">
              Меня зовут так, как подписаны мои книги. Я живу словами с тех пор, как впервые понял, что строка может остановить время. Стихи, рассказы, эссе — для меня это разные способы прислушаться к одной и той же тишине.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              На этом сайте я собираю всё, что пишу, — без редакторов и спешки. Здесь можно читать, оставлять отклики и иногда заглядывать за кулисы творчества.
            </p>
            <div className="flex gap-8">
              {[['250+', 'произведений'], ['3', 'книги'], ['14 лет', 'в литературе']].map(([n, l]) => (
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
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
          <Input type="email" placeholder="ваша почта" className="rounded-sm bg-card border-border" />
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-sm px-8 whitespace-nowrap">
            Подписаться
          </Button>
        </form>
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
              {[['Mail', 'author@chernila.ru'], ['Send', 't.me/chernila_i_tishina'], ['MapPin', 'Санкт-Петербург']].map(([icon, val]) => (
                <div key={val} className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-sm bg-primary-foreground/10 flex items-center justify-center text-accent">
                    <Icon name={icon} size={20} />
                  </div>
                  <span className="text-primary-foreground/90">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input placeholder="Ваше имя" className="rounded-sm bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40" />
            <Input type="email" placeholder="Почта для ответа" className="rounded-sm bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40" />
            <Textarea placeholder="Ваше сообщение…" rows={5} className="rounded-sm bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 resize-none" />
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-sm">
              Отправить письмо
            </Button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="font-serif italic text-lg">Чернила <span className="text-accent">&</span> тишина</p>
          <p>© {new Date().getFullYear()} · Все права на тексты принадлежат автору</p>
        </div>
      </footer>
    </div>
  );
}