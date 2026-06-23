import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const WORKS_URL = 'https://functions.poehali.dev/97e50fe2-d8c6-47a8-86fc-bbb58aeb0192';
const COMMENTS_URL = 'https://functions.poehali.dev/20b2c93c-b071-4d5c-854e-a1e7805084bf';
const VISITS_URL = WORKS_URL + '?action=visit';

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

interface Comment {
  id: number;
  work_id: number;
  parent_id: number | null;
  author_name: string;
  body: string;
  is_author: boolean;
  created_at: string;
}

export default function WorkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);

  const adminToken = localStorage.getItem('admin_token') || '';
  const isAdmin = !!adminToken;

  useEffect(() => {
    fetch(VISITS_URL, { method: 'POST' }).catch(() => {});
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

  useEffect(() => {
    if (!id) return;
    fetch(`${COMMENTS_URL}?work_id=${id}`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .finally(() => setCommentsLoading(false));
  }, [id]);

  const sendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setSending(true);
    const res = await fetch(COMMENTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(isAdmin ? { 'X-Auth-Token': adminToken } : {}),
      },
      body: JSON.stringify({
        work_id: Number(id),
        body: text,
        author_name: isAdmin ? 'Автор' : (authorName.trim() || 'Читатель'),
        parent_id: replyTo?.id || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const newComment: Comment = {
        id: data.id,
        work_id: Number(id),
        parent_id: replyTo?.id || null,
        author_name: isAdmin ? 'Автор' : (authorName.trim() || 'Читатель'),
        body: text,
        is_author: isAdmin,
        created_at: data.created_at,
      };
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setReplyTo(null);
    }
    setSending(false);
  };

  const deleteComment = async (commentId: number) => {
    await fetch(`${COMMENTS_URL}?id=${commentId}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': adminToken },
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId || c.parent_id === commentId ? { ...c, body: '[удалено]' } : c
      )
    );
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = (parentId: number) => comments.filter((c) => c.parent_id === parentId);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

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
          <span>{formatDate(work.created_at)}</span>
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

        {work.image_url && (
          <div className="mb-10">
            <img src={work.image_url} alt={work.title} className="w-full max-h-96 object-cover rounded-sm border border-border" />
          </div>
        )}

        {work.excerpt && (
          <p className="text-muted-foreground italic text-lg leading-relaxed mb-10 border-l-2 border-accent pl-5">
            {work.excerpt}
          </p>
        )}

        <div className="font-serif font-medium text-xl sm:text-2xl leading-[1.9] whitespace-pre-wrap text-foreground">
          {work.body}
        </div>

        {work.audio_url && (
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3 uppercase tracking-widest text-xs">Аудиозапись</p>
            <audio controls src={work.audio_url} className="w-full" />
          </div>
        )}

        {/* КОММЕНТАРИИ */}
        <div className="mt-16 pt-10 border-t border-border">
          <h2 className="font-serif text-2xl mb-8">
            Комментарии{comments.length > 0 && <span className="text-muted-foreground text-lg ml-2">({comments.length})</span>}
          </h2>

          {commentsLoading && (
            <p className="text-muted-foreground text-sm italic">Загружаю…</p>
          )}

          {!commentsLoading && comments.length === 0 && (
            <p className="text-muted-foreground italic mb-8">Пока нет комментариев. Будьте первым!</p>
          )}

          {!commentsLoading && topLevel.map((comment) => (
            <div key={comment.id} className="mb-6">
              <div className={`rounded-sm p-5 ${comment.is_author ? 'bg-accent/10 border border-accent/30' : 'bg-card border border-border'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${comment.is_author ? 'text-accent' : 'text-foreground'}`}>
                      {comment.is_author ? '✍️ Автор' : comment.author_name}
                    </span>
                    <span className="text-muted-foreground text-xs">{formatDate(comment.created_at)}</span>
                  </div>
                  <div className="flex gap-3">
                    {!isAdmin && (
                      <button
                        onClick={() => { setReplyTo(comment); setCommentText(''); }}
                        className="text-xs text-muted-foreground hover:text-accent transition-colors"
                      >
                        Ответить
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{comment.body}</p>
              </div>

              {replies(comment.id).map((reply) => (
                <div key={reply.id} className={`ml-6 mt-3 rounded-sm p-4 ${reply.is_author ? 'bg-accent/10 border border-accent/30' : 'bg-card border border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${reply.is_author ? 'text-accent' : 'text-foreground'}`}>
                        {reply.is_author ? '✍️ Автор' : reply.author_name}
                      </span>
                      <span className="text-muted-foreground text-xs">{formatDate(reply.created_at)}</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteComment(reply.id)}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{reply.body}</p>
                </div>
              ))}

              {isAdmin && (
                <button
                  onClick={() => { setReplyTo(comment); setCommentText(''); }}
                  className="ml-6 mt-2 text-xs text-accent hover:underline"
                >
                  + Ответить на этот комментарий
                </button>
              )}
            </div>
          ))}

          {/* ФОРМА */}
          <div className="mt-8 bg-card border border-border rounded-sm p-6">
            {replyTo && (
              <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground bg-background rounded px-3 py-2">
                <span>Ответ на комментарий <b>{replyTo.author_name}</b></span>
                <button onClick={() => setReplyTo(null)} className="hover:text-foreground">
                  <Icon name="X" size={14} />
                </button>
              </div>
            )}
            {!isAdmin && (
              <input
                type="text"
                placeholder="Ваше имя (необязательно)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-4 py-2 text-sm mb-3 outline-none focus:border-accent transition-colors"
              />
            )}
            <textarea
              placeholder={isAdmin ? 'Ваш ответ читателям…' : 'Напишите комментарий…'}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border rounded-sm px-4 py-2 text-sm mb-3 outline-none focus:border-accent transition-colors resize-none"
            />
            <button
              onClick={sendComment}
              disabled={sending || !commentText.trim()}
              className="bg-accent text-white text-sm px-5 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {sending ? 'Отправляю…' : isAdmin ? 'Опубликовать ответ' : 'Оставить комментарий'}
            </button>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
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