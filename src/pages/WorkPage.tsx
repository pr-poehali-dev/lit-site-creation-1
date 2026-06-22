import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

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

export default function WorkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${WORKS_URL}?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        const found = Array.isArray(data) ? data.find((w: Work) => w.id === Number(id)) : data;
        if (found) setWork(found);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="Loader" size={28} className="animate-spin" />
          <p className="font-serif italic text-xl">Листаю страницы…</p>
        </div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-2xl italic text-muted-foreground mb-6">Произведение не найдено</p>
          <button onClick={() => navigate('/')} className="text-accent underline underline-offset-4">
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <button
          onClick={() => navigate('/#works')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-12 text-sm"
        >
          <Icon name="ArrowLeft" size={16} />
          Все произведения
        </button>

        <div className="mb-2">
          <span className="text-accent uppercase tracking-widest text-xs">{work.genre}</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl mb-4">{work.title}</h1>

        <div className="flex items-center gap-4 text-muted-foreground text-sm mb-12">
          <span>
            {new Date(work.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          {work.read_time && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Icon name="Clock" size={14} />
                {work.read_time}
              </span>
            </>
          )}
        </div>

        {work.excerpt && (
          <p className="text-muted-foreground italic text-lg leading-relaxed mb-10 border-l-2 border-accent pl-5">
            {work.excerpt}
          </p>
        )}

        <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap">
          {work.body}
        </div>

        {work.audio_url && (
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3 uppercase tracking-widest text-xs">Аудиозапись</p>
            <audio controls src={work.audio_url} className="w-full" />
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-border">
          <button
            onClick={() => navigate('/#works')}
            className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors text-sm"
          >
            <Icon name="ArrowLeft" size={16} />
            Вернуться к произведениям
          </button>
        </div>
      </div>
    </div>
  );
}
