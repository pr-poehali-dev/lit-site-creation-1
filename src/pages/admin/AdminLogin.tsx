import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  password: string;
  setPassword: (v: string) => void;
  loginError: string;
  loginLoading: boolean;
  onLogin: () => void;
}

export default function AdminLogin({ password, setPassword, loginError, loginLoading, onLogin }: Props) {
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
            onKeyDown={(e) => e.key === 'Enter' && onLogin()}
            className="rounded-sm"
          />
          {loginError && <p className="text-destructive text-sm">{loginError}</p>}
          <Button onClick={onLogin} disabled={loginLoading} className="w-full bg-primary text-primary-foreground rounded-sm">
            {loginLoading ? 'Вхожу…' : 'Войти'}
          </Button>
        </div>
      </div>
    </div>
  );
}
