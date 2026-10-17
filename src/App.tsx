import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Download,
  Dumbbell,
  Edit3,
  FileBarChart2,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
  Zap,
  Printer,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { api, setCsrf, money, fmtDate, download, csv } from './api';
import type { State, Entity, FormValues, Exercise, Member, Invoice, Workout, Role } from './types';
const roleNames: Record<Role, string> = {
  admin: 'Administrador',
  reception: 'Recepção',
  trainer: 'Professor',
};
const labels: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  cancelled: 'Cancelado',
  open: 'Em aberto',
  paid: 'Pago',
  overdue: 'Vencido',
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
  transfer: 'Transferência',
};
const nav = [
  { id: 'dashboard', title: 'Visão geral', icon: LayoutDashboard },
  { id: 'members', title: 'Alunos', icon: Users },
  { id: 'finance', title: 'Financeiro', icon: CircleDollarSign },
  { id: 'plans', title: 'Planos', icon: CreditCard },
  { id: 'classes', title: 'Agenda de aulas', icon: CalendarDays },
  { id: 'checkins', title: 'Frequência', icon: Fingerprint },
  { id: 'workouts', title: 'Fichas de treino', icon: Dumbbell },
  { id: 'assessments', title: 'Avaliações', icon: Activity },
  { id: 'reports', title: 'Relatórios', icon: FileBarChart2 },
  { id: 'settings', title: 'Configurações', icon: Settings },
];
const subtitles: Record<string, string> = {
  dashboard: 'Cada detalhe sob controle. Cada aluno em movimento.',
  members: 'Relacionamentos que começam com um bom atendimento.',
  finance: 'Acompanhe suas mensalidades, recebimentos e pendências.',
  plans: 'Ofertas claras para diferentes objetivos.',
  classes: 'Organize suas aulas e acompanhe cada reserva.',
  checkins: 'A rotina da sua academia, presença por presença.',
  workouts: 'Prescrições organizadas. Evolução acompanhada.',
  assessments: 'Registros de avaliação para orientar o acompanhamento.',
  reports: 'Transforme os registros da academia em informação.',
  settings: 'Sua academia, sua equipe, suas preferências.',
};
const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
function Badge({ value }: { value: string }) {
  return <span className={`badge ${value}`}>{labels[value] || value}</span>;
}
function Empty({
  title = 'Nenhum registro por aqui',
  text = 'Comece adicionando seu primeiro registro.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <ClipboardList size={30} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={onClose}>
      <header>
        <div>
          <small>SCAR / GESTÃO FITNESS</small>
          <h2>{title}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Kpi({
  title,
  value,
  detail,
  icon: Icon,
  accent = false,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  accent?: boolean;
}) {
  return (
    <article className={`kpi ${accent ? 'accent' : ''}`}>
      <div className="kpi-label">
        {title}
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}
function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Login({ onLogin }: { onLogin: (s: State) => void }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [demo, setDemo] = useState(false),
    [initialized, setInitialized] = useState(true);
  useEffect(() => {
    api<{ demo: boolean; initialized: boolean }>('/health')
      .then((c) => {
        setDemo(c.demo);
        setInitialized(c.initialized);
      })
      .catch(() => setError('Servidor indisponível. Confira se npm start está em execução.'));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api<State>('/login', 'POST', { email, password }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-art">
        <div className="brand">
          <span className="brand-symbol">
            <Zap fill="currentColor" />
          </span>
          scar<span className="brand-dot">.</span>
        </div>
        <div className="login-copy">
          <span className="eyebrow">MENOS BUROCRACIA. MAIS MOVIMENTO.</span>
          <h1>
            Seu próximo
            <br />
            nível começa
            <br />
            <em>na gestão.</em>
          </h1>
          <p>
            Alunos, treinos e resultados.
            <br />
            Tudo conectado à rotina da sua academia.
          </p>
          <div className="login-pill">
            <span className="pulse" />
            Gestão fitness, de ponta a ponta
            <ArrowUpRight size={18} />
          </div>
        </div>
        <div className="orbit o1" />
        <div className="orbit o2" />
        <footer>
          SCAR — GESTÃO FITNESS <span>01 / MOVIMENTO</span>
        </footer>
      </section>
      <section className="login-form">
        <div className="mobile-brand">scar.</div>
        <span className="eyebrow muted">BEM-VINDO DE VOLTA</span>
        <h2>
          Vamos movimentar
          <br />o seu dia?
        </h2>
        <p>Acesse o painel da sua academia.</p>
        {demo && (
          <div className="demo-login">
            <strong>Ambiente de demonstração</strong>
            <p>
              Use demo@scar.local e Demo@Scar2026.
              <br />
              Todos os dados são fictícios.
            </p>
            <button
              className="text-btn"
              onClick={() => {
                setEmail('demo@scar.local');
                setPassword('Demo@Scar2026');
              }}
            >
              Preencher acesso de demonstração <ArrowUpRight size={15} />
            </button>
          </div>
        )}
        {!initialized && (
          <div className="notice">
            Primeiro acesso: execute <code>npm run setup</code> no servidor para criar o
            administrador.
          </div>
        )}
        <form onSubmit={submit}>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@academia.com.br"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha de acesso"
              maxLength={200}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy || !initialized} className="btn primary login-button">
            {busy ? 'Entrando…' : 'Entrar no painel'}
            <ArrowUpRight size={19} />
          </button>
        </form>
        <div className="login-security">
          <ShieldCheck size={17} />
          Acesso individual. Gestão centralizada.
        </div>
        <small className="login-bottom">
          Precisa de acesso? Fale com o administrador da academia.
        </small>
      </section>
    </div>
  );
}
function Editor({
  entity,
  initial,
  data,
  onClose,
  onSubmit,
  busy,
}: {
  entity: Entity;
  initial: FormValues;
  data: State;
  onClose: () => void;
  onSubmit: (v: FormValues) => Promise<void>;
  busy: boolean;
}) {
  const [v, setV] = useState<FormValues>(initial);
  const [error, setError] = useState('');
  const update = (name: string, value: FormValues[string]) =>
    setV((old) => ({ ...old, [name]: value }));
  const title: Record<Entity, string> = {
    members: 'Cadastro de aluno',
    plans: 'Plano da academia',
    workouts: 'Ficha de treino',
    assessments: 'Avaliação física',
    classes: 'Aula na agenda',
    users: 'Acesso da equipe',
    payment: 'Registrar recebimento',
    booking: 'Reservar uma vaga',
    checkin: 'Registrar check-in',
    password: 'Alterar minha senha',
  };
  const input = (
    name: string,
    label: string,
    type = 'text',
    required = true,
    extra: Record<string, string | number> = {},
  ) => (
    <label key={name}>
      {label}
      <input
        name={name}
        type={type}
        value={String(v[name] ?? '')}
        required={required}
        onChange={(e) =>
          update(
            name,
            type === 'number'
              ? e.target.value === ''
                ? ''
                : Number(e.target.value)
              : e.target.value,
          )
        }
        {...extra}
      />
    </label>
  );
  const select = (
    name: string,
    label: string,
    items: { value: string | number; label: string }[],
  ) => (
    <label key={name}>
      {label}
      <select
        value={String(v[name] ?? '')}
        required
        onChange={(e) =>
          update(
            name,
            ['member_id', 'plan_id', 'class_id'].includes(name)
              ? Number(e.target.value)
              : e.target.value,
          )
        }
      >
        <option value="">Selecione</option>
        {items.map((i) => (
          <option key={i.value} value={i.value}>
            {i.label}
          </option>
        ))}
      </select>
    </label>
  );
  const notes = (
    <label className="full">
      Observações
      <textarea
        value={String(v.notes ?? '')}
        maxLength={2000}
        onChange={(e) => update('notes', e.target.value)}
        rows={3}
      />
    </label>
  );
  const memberSelect = select(
    'member_id',
    'Aluno',
    data.members.map((m) => ({ value: m.id, label: m.name })),
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await onSubmit(v);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const exercises = (v.exercises || []) as Exercise[];
  return (
    <Modal title={title[entity]} onClose={onClose} wide={entity === 'workouts'}>
      <form onSubmit={submit}>
        <div className="form-grid">
          {entity === 'members' && (
            <>
              {input('name', 'Nome completo', 'text', true, { maxLength: 120 })}
              {input('email', 'E-mail', 'email', false)}
              {input('phone', 'Celular', 'tel', false)}
              {input('birth_date', 'Nascimento', 'date', false, { max: data.today })}
              {select(
                'plan_id',
                'Plano',
                data.plans.map((p) => ({ value: p.id, label: `${p.name} • ${money(p.price)}` })),
              )}
              {select('status', 'Situação', [
                { value: 'active', label: 'Ativo' },
                { value: 'paused', label: 'Pausado' },
                { value: 'cancelled', label: 'Cancelado' },
              ])}
              {input('due_day', 'Dia de vencimento', 'number', true, { min: 1, max: 28 })}
              {input('joined_at', 'Data da matrícula', 'date')}
              {notes}
            </>
          )}
          {entity === 'plans' && (
            <>
              {input('name', 'Nome do plano')}
              {input('price', 'Mensalidade (R$)', 'number', true, { min: 0, step: 0.01 })}
              <label className="full">
                O que está incluído
                <textarea
                  value={String(v.description ?? '')}
                  onChange={(e) => update('description', e.target.value)}
                  maxLength={500}
                />
              </label>
            </>
          )}
          {entity === 'workouts' && (
            <>
              {memberSelect}
              {input('title', 'Nome da ficha')}
              {input('goal', 'Objetivo', 'text', false)}
              {input('valid_until', 'Válida até', 'date')}
              <div className="exercise-editor full">
                <div className="section-heading">
                  <h3>Exercícios</h3>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() =>
                      update('exercises', [
                        ...exercises,
                        { name: '', sets: 3, reps: '12', load: '', rest: '60 s' },
                      ])
                    }
                  >
                    <Plus size={16} />
                    Adicionar
                  </button>
                </div>
                {exercises.map((ex, i) => (
                  <div className="exercise-row" key={i}>
                    {(['name', 'sets', 'reps', 'load', 'rest'] as const).map((key, j) => (
                      <label key={key}>
                        {['Exercício', 'Séries', 'Repetições', 'Carga', 'Descanso'][j]}
                        <input
                          aria-label={`${['Exercício', 'Séries', 'Repetições', 'Carga', 'Descanso'][j]} ${i + 1}`}
                          value={ex[key]}
                          type={key === 'sets' ? 'number' : 'text'}
                          min={key === 'sets' ? 1 : undefined}
                          max={key === 'sets' ? 20 : undefined}
                          required={['name', 'sets', 'reps'].includes(key)}
                          onChange={(e) =>
                            update(
                              'exercises',
                              exercises.map((x, n) =>
                                n === i
                                  ? {
                                      ...x,
                                      [key]:
                                        key === 'sets' ? Number(e.target.value) : e.target.value,
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Remover exercício ${i + 1}`}
                      onClick={() =>
                        update(
                          'exercises',
                          exercises.filter((_, n) => n !== i),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {notes}
            </>
          )}
          {entity === 'assessments' && (
            <>
              {memberSelect}
              {input('date', 'Data da avaliação', 'date')}
              {input('weight', 'Peso (kg)', 'number', true, { min: 1, max: 500, step: 0.1 })}
              {input('height', 'Altura (cm)', 'number', true, { min: 30, max: 250, step: 0.1 })}
              {input('waist', 'Cintura (cm)', 'number', false, { min: 1, max: 300, step: 0.1 })}
              {input('body_fat', 'Gordura corporal (%)', 'number', false, {
                min: 0,
                max: 80,
                step: 0.1,
              })}
              {notes}
              <p className="form-hint full">
                Registre medidas obtidas pelo profissional. O sistema não realiza diagnóstico nem
                prescreve treinos automaticamente.
              </p>
            </>
          )}
          {entity === 'classes' && (
            <>
              {input('title', 'Nome da aula')}
              {input('instructor', 'Professor')}
              {input('date', 'Data', 'date')}
              {input('time', 'Horário', 'time')}
              {input('capacity', 'Número de vagas', 'number', true, { min: 1, max: 500 })}
              {input('duration', 'Duração (minutos)', 'number', true, { min: 5, max: 480 })}
            </>
          )}
          {entity === 'users' && (
            <>
              {input('name', 'Nome')}
              {input('email', 'E-mail', 'email')}
              {select('role', 'Perfil', [
                { value: 'admin', label: 'Administrador' },
                { value: 'reception', label: 'Recepção' },
                { value: 'trainer', label: 'Professor' },
              ])}
              {input('password', 'Senha inicial (12+ caracteres)', 'password', true, {
                minLength: 12,
                maxLength: 200,
              })}
            </>
          )}
          {entity === 'payment' && (
            <>
              <div className="payment-summary full">
                <span>Mensalidade selecionada</span>
                <strong>{money(Number(v.amount))}</strong>
                <p>{data.members.find((m) => m.id === v.member_id)?.name}</p>
              </div>
              {select('method', 'Forma de pagamento', [
                { value: 'pix', label: 'Pix' },
                { value: 'cash', label: 'Dinheiro' },
                { value: 'card', label: 'Cartão' },
                { value: 'transfer', label: 'Transferência' },
              ])}
              {input('paid_at', 'Data do recebimento', 'date', true, { max: data.today })}
              <p className="form-hint full">
                Registre somente pagamentos já conferidos. Esta ação faz a baixa interna e não
                movimenta dinheiro.
              </p>
            </>
          )}
          {entity === 'booking' && (
            <>
              {memberSelect}
              {select(
                'class_id',
                'Aula',
                data.classes
                  .filter((c) => c.date >= data.today)
                  .map((c) => ({
                    value: c.id,
                    label: `${c.title} • ${fmtDate(c.date)} ${c.time}`,
                  })),
              )}
            </>
          )}
          {entity === 'password' && (
            <>
              {input('currentPassword', 'Senha atual', 'password')}
              {input('newPassword', 'Nova senha (12+ caracteres)', 'password', true, {
                minLength: 12,
                maxLength: 200,
              })}
            </>
          )}
          {entity === 'checkin' && (
            <>
              {memberSelect}
              <div className="form-hint full">
                Um check-in por aluno por dia. Matrículas inativas e mensalidades vencidas bloqueiam
                a entrada.
              </div>
            </>
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button disabled={busy} className="btn primary">
            {busy
              ? 'Salvando…'
              : entity === 'payment'
                ? 'Confirmar recebimento'
                : 'Salvar registro'}
            <Check size={17} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export default function App() {
  const [data, setData] = useState<State | null>(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState('dashboard'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<{ entity: Entity; initial: FormValues } | null>(null),
    [profile, setProfile] = useState<Member | null>(null),
    [viewWorkout, setViewWorkout] = useState<Workout | null>(null),
    [classId, setClassId] = useState<number | null>(null),
    [assessmentMember, setAssessmentMember] = useState(''),
    [period, setPeriod] = useState('');
  const [settings, setSettings] = useState({ name: '', email: '', phone: '' });
  const notifyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function accept(s: State) {
    setData(s);
    setCsrf(s.csrf);
    setSettings(s.settings);
    if (!period) setPeriod(s.today.slice(0, 7));
  }
  async function reload() {
    accept(await api<State>('/state'));
  }
  useEffect(() => {
    let alive = true;
    api<State>('/state')
      .then((s) => {
        if (alive) {
          setData(s);
          setCsrf(s.csrf);
          setSettings(s.settings);
          setPeriod(s.today.slice(0, 7));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      clearTimeout(notifyTimer.current);
    };
  }, []);
  function notify(s: string) {
    setNotice(s);
    clearTimeout(notifyTimer.current);
    notifyTimer.current = setTimeout(() => setNotice(''), 5000);
  }
  function go(p: string) {
    setPage(p);
    setSearch('');
    setFilter('all');
    setError('');
    setMenu(false);
  }
  async function action(fn: () => Promise<unknown>, success = 'Registro atualizado.') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      await reload();
      notify(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function open(entity: Entity, existing?: object) {
    if (!data) return;
    const defaults: Record<Entity, FormValues> = {
      members: {
        name: '',
        email: '',
        phone: '',
        birth_date: '',
        plan_id: data.plans[0]?.id ?? '',
        status: 'active',
        due_day: 10,
        joined_at: data.today,
        notes: '',
      },
      plans: { name: '', price: 0, description: '' },
      workouts: {
        member_id: data.members[0]?.id ?? '',
        title: 'Treino A',
        goal: '',
        valid_until: data.today,
        exercises: [{ name: '', sets: 3, reps: '12', load: '', rest: '60 s' }],
        notes: '',
      },
      assessments: {
        member_id: data.members[0]?.id ?? '',
        date: data.today,
        weight: '',
        height: '',
        waist: '',
        body_fat: '',
        notes: '',
      },
      classes: {
        title: '',
        instructor: '',
        date: data.today,
        time: '18:00',
        capacity: 20,
        duration: 50,
      },
      users: { name: '', email: '', password: '', role: 'reception' },
      payment: { method: 'pix', paid_at: data.today },
      booking: { member_id: data.members[0]?.id ?? '', class_id: classId ?? '' },
      checkin: { member_id: '' },
      password: { currentPassword: '', newPassword: '' },
    };
    setEditor({ entity, initial: { ...defaults[entity], ...existing } as FormValues });
  }
  async function save(v: FormValues) {
    if (!editor) return;
    setBusy(true);
    try {
      const { entity } = editor;
      const payload = { ...v };
      if (entity === 'plans') payload.price = Math.round(Number(v.price) * 100);
      if (entity === 'assessments') {
        payload.waist = v.waist === '' ? null : v.waist;
        payload.body_fat = v.body_fat === '' ? null : v.body_fat;
      }
      const path =
        entity === 'payment'
          ? `/invoices/${v.id}`
          : entity === 'booking'
            ? '/bookings'
            : entity === 'checkin'
              ? '/checkins'
              : `/${entity}${v.id ? '/' + v.id : ''}`;
      await api(
        path,
        v.id ? 'PATCH' : 'POST',
        entity === 'payment' ? { status: 'paid', method: v.method, paid_at: v.paid_at } : payload,
      );
      setEditor(null);
      await reload();
      notify('Registro salvo com sucesso.');
    } finally {
      setBusy(false);
    }
  }
  function remove(entity: string, id: number) {
    if (confirm('Excluir este registro? Esta ação não pode ser desfeita.'))
      void action(() => api(`/${entity}/${id}`, 'DELETE', {}), 'Registro excluído.');
  }
  if (loading)
    return (
      <div className="loading">
        <Zap size={36} />
        <span>Carregando sua academia…</span>
      </div>
    );
  if (!data) return <Login onLogin={accept} />;
  const { user, members, plans, classes, checkins, bookings } = data;
  const invoices = data.invoices ?? [],
    workouts = data.workouts ?? [],
    assessments = data.assessments ?? [];
  const canFinance = user.role !== 'trainer',
    canTraining = user.role !== 'reception';
  const memberName = (id: number) => members.find((m) => m.id === id)?.name ?? 'Aluno';
  const invoiceStatus = (i: Invoice) =>
    i.status === 'open' && i.due_date < data.today ? 'overdue' : i.status;
  const filteredMembers = members.filter(
    (m) =>
      (m.name + ' ' + m.email + ' ' + m.phone).toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' || m.status === filter),
  );
  const monthInvoices = invoices.filter((i) => i.period === period);
  const received = monthInvoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + i.amount, 0),
    pending = monthInvoices.filter((i) => i.status === 'open').reduce((s, i) => s + i.amount, 0);
  const overdue = monthInvoices.filter((i) => invoiceStatus(i) === 'overdue'),
    active = members.filter((m) => m.status === 'active').length;
  const filteredInvoices = monthInvoices.filter(
    (i) =>
      memberName(i.member_id).toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' || invoiceStatus(i) === filter),
  );
  const todayClasses = classes
    .filter((c) => c.date === data.today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const todayCheckins = checkins.filter((c) => c.date === data.today);
  const allowedNav = nav.filter(
    (n) =>
      !(user.role === 'trainer' && ['finance', 'reports', 'settings'].includes(n.id)) &&
      !(user.role === 'reception' && ['workouts', 'assessments', 'settings'].includes(n.id)),
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(data.today + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 6 + i);
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      label: d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
      value: checkins.filter((c) => c.date === key).length,
    };
  });
  const maxCount = Math.max(1, ...days.map((d) => d.value));
  function exportFinance() {
    download(
      `scar-financeiro-${period}.csv`,
      csv([
        ['Aluno', 'Competência', 'Vencimento', 'Valor (R$)', 'Situação', 'Recebido em', 'Forma'],
        ...monthInvoices.map((i) => [
          memberName(i.member_id),
          i.period,
          i.due_date,
          (i.amount / 100).toFixed(2).replace('.', ','),
          labels[invoiceStatus(i)],
          i.paid_at || '',
          labels[i.method || ''] || '',
        ]),
      ]),
      'text/csv;charset=utf-8',
    );
  }
  const primary =
    page === 'members'
      ? () => open('members')
      : page === 'finance'
        ? () =>
            void action(async () => {
              const r = await api<{ count: number }>('/invoices/generate', 'POST', { period });
              notify(`${r.count} mensalidade(s) gerada(s).`);
            }, 'Competência atualizada. Mensalidades existentes foram preservadas.')
        : page === 'plans' && user.role === 'admin'
          ? () => open('plans')
          : page === 'classes'
            ? () => open('classes')
            : page === 'checkins' && canFinance
              ? () => open('checkin')
              : page === 'workouts'
                ? () => open('workouts')
                : page === 'assessments'
                  ? () => open('assessments')
                  : page === 'dashboard' && canFinance
                    ? () => open('members')
                    : null;
  const primaryLabel: Record<string, string> = {
    members: 'Novo aluno',
    finance: 'Gerar mensalidades',
    plans: 'Novo plano',
    classes: 'Nova aula',
    checkins: 'Registrar entrada',
    workouts: 'Nova ficha',
    assessments: 'Nova avaliação',
    dashboard: 'Novo aluno',
  };
  const selectedClass = classes.find((c) => c.id === classId);
  return (
    <div className="app">
      <aside className={menu ? 'sidebar open' : 'sidebar'}>
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            go('dashboard');
          }}
          className="brand"
        >
          <span className="brand-symbol">
            <Zap fill="currentColor" size={23} />
          </span>
          scar<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">
            <Dumbbell size={20} />
          </span>
          <div>
            <strong>{data.settings.name}</strong>
            <small>GESTÃO DA ACADEMIA</small>
          </div>
          <span className="status-dot" />
        </div>
        <small className="nav-label">PRINCIPAL</small>
        <nav>
          {allowedNav.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={page === n.id ? 'nav-item active' : 'nav-item'}
            >
              <n.icon size={19} />
              {n.title}
              {n.id === 'members' && <span className="nav-count">{members.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="version">
            <span className="pulse" />
            SCAR 1.0 <span>{data.demo ? 'DEMO' : 'LOCAL'}</span>
          </div>
          <button
            className="user-button"
            onClick={async () => {
              try {
                await api('/logout', 'POST', {});
                setData(null);
                setCsrf('');
                setPage('dashboard');
                setError('');
              } catch (e) {
                setError((e as Error).message);
              }
            }}
            title="Sair da conta"
          >
            <span className="avatar">{initials(user.name)}</span>
            <span>
              <strong>{user.name.split(' • ')[0]}</strong>
              <small>{roleNames[user.role]}</small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {menu && (
        <button className="menu-overlay" aria-label="Fechar menu" onClick={() => setMenu(false)} />
      )}
      <div className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Abrir menu"
            >
              <Menu />
            </button>
            <span>Painel de gestão</span>
            <ChevronRight size={15} />
            <strong>{nav.find((n) => n.id === page)?.title}</strong>
          </div>
          <div className="topbar-right">
            <span className="date-today">
              {new Date(data.today + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              title="Atualizar dados"
              aria-label="Atualizar dados"
              className="icon-btn"
              disabled={busy}
              onClick={() => void action(reload, 'Dados atualizados.')}
            >
              <RefreshCw size={17} />
            </button>
            <button
              className="icon-btn"
              onClick={() => open('password')}
              title="Alterar minha senha"
              aria-label="Alterar minha senha"
            >
              <ShieldCheck size={18} />
            </button>
            <span className="avatar small">{initials(user.name)}</span>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow muted">
                {page === 'dashboard'
                  ? 'SUA ACADEMIA EM MOVIMENTO'
                  : 'GESTÃO / ' + nav.find((n) => n.id === page)?.title.toUpperCase()}
              </div>
              <h1>
                {page === 'dashboard'
                  ? `Olá, ${user.name.split(/[ •]/)[0]}. Vamos nessa!`
                  : nav.find((n) => n.id === page)?.title}
              </h1>
              <p>{subtitles[page]}</p>
            </div>
            <div className="heading-actions">
              {['dashboard', 'finance', 'reports'].includes(page) && canFinance && (
                <label className="month-picker">
                  <CalendarDays size={16} />
                  <input
                    aria-label="Competência"
                    type="month"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  />
                </label>
              )}
              {primary && !(page === 'members' && user.role === 'trainer') && (
                <button className="btn primary" disabled={busy} onClick={primary}>
                  <Plus size={17} />
                  {primaryLabel[page]}
                </button>
              )}
            </div>
          </div>
          {data.demo && (
            <div className="demo-strip">
              <span>
                <span className="status-dot" />
                Ambiente de demonstração · dados fictícios
              </span>
              <small>As alterações são salvas no banco de demonstração.</small>
            </div>
          )}
          {error && (
            <div role="alert" className="notice error">
              <AlertCircle size={19} />
              {error}
              <button className="icon-btn" aria-label="Fechar erro" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {page === 'dashboard' && (
            <>
              <div className="kpi-grid">
                <Kpi
                  title="Alunos ativos"
                  value={active}
                  detail={`${members.length} alunos cadastrados`}
                  icon={Users}
                />
                {canFinance ? (
                  <>
                    <Kpi
                      title="Recebido na competência"
                      value={money(received)}
                      detail={`${monthInvoices.filter((i) => i.status === 'paid').length} mensalidades pagas`}
                      icon={ArrowDownLeft}
                      accent
                    />
                    <Kpi
                      title="A receber"
                      value={money(pending)}
                      detail={`${overdue.length} mensalidades vencidas`}
                      icon={CircleDollarSign}
                    />
                  </>
                ) : (
                  <>
                    <Kpi
                      title="Fichas de treino"
                      value={workouts.length}
                      detail="Prescrições registradas"
                      icon={Dumbbell}
                      accent
                    />
                    <Kpi
                      title="Avaliações"
                      value={assessments.length}
                      detail="Histórico dos alunos"
                      icon={Activity}
                    />
                  </>
                )}
                <Kpi
                  title="Check-ins de hoje"
                  value={todayCheckins.length}
                  detail="Alunos presentes no dia"
                  icon={Fingerprint}
                />
              </div>
              <div className="dashboard-grid">
                <section className="panel attendance-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Academia em movimento</h2>
                      <p>Presenças nos últimos 7 dias</p>
                    </div>
                    <span className="legend">
                      <i />
                      Check-ins
                    </span>
                  </div>
                  <div className="chart">
                    <div className="chart-scale">
                      <span>{maxCount}</span>
                      <span>{Math.round(maxCount / 2)}</span>
                      <span>0</span>
                    </div>
                    <div className="chart-bars">
                      {days.map((d) => (
                        <div className="bar-column" key={d.key}>
                          <div className="bar-area">
                            <div
                              className={`bar ${d.key === data.today ? 'current' : ''}`}
                              style={{
                                height: `${(d.value / maxCount) * 100}%`,
                                minHeight: d.value ? 6 : 0,
                              }}
                              title={`${fmtDate(d.key)}: ${d.value} check-ins`}
                            >
                              <span>{d.value}</span>
                            </div>
                          </div>
                          <small>{d.label}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel-foot">
                    <span>
                      <strong>{days.reduce((s, d) => s + d.value, 0)}</strong> presenças no período
                    </span>
                    <button className="text-btn" onClick={() => go('checkins')}>
                      Ver frequência
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </section>
                <section className="panel schedule-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Na agenda de hoje</h2>
                      <p>{todayClasses.length} aulas programadas</p>
                    </div>
                    <CalendarDays size={20} />
                  </div>
                  {todayClasses.length ? (
                    todayClasses.map((c) => (
                      <button
                        key={c.id}
                        className="schedule-row"
                        onClick={() => {
                          setClassId(c.id);
                          go('classes');
                        }}
                      >
                        <span className="schedule-time">
                          {c.time}
                          <small>{c.duration} min</small>
                        </span>
                        <span className="schedule-info">
                          <strong>{c.title}</strong>
                          <small>{c.instructor}</small>
                        </span>
                        <span className="seat-count">
                          {bookings.filter((b) => b.class_id === c.id).length}/{c.capacity}
                          <small>vagas</small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <Empty title="Agenda livre" text="Cadastre aulas e receba reservas." />
                  )}
                  <div className="panel-foot">
                    <button className="text-btn" onClick={() => go('classes')}>
                      Abrir agenda completa
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </section>
              </div>
              <div className="dashboard-grid bottom">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Alunos recentes</h2>
                      <p>Os novos nomes do seu time</p>
                    </div>
                    <button className="text-btn" onClick={() => go('members')}>
                      Ver todos
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {members.length ? (
                    <Table headers={['Aluno', 'Plano', 'Situação', '']}>
                      {members.slice(0, 5).map((m) => (
                        <tr key={m.id}>
                          <td>
                            <div className="person">
                              <span className={`avatar color-${m.id % 4}`}>{initials(m.name)}</span>
                              <span>
                                <strong>{m.name}</strong>
                                <small>Desde {fmtDate(m.joined_at)}</small>
                              </span>
                            </div>
                          </td>
                          <td>{plans.find((p) => p.id === m.plan_id)?.name}</td>
                          <td>
                            <Badge value={m.status} />
                          </td>
                          <td>
                            <button
                              aria-label={`Abrir ${m.name}`}
                              className="icon-btn"
                              onClick={() => setProfile(m)}
                            >
                              <ChevronRight size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </Table>
                  ) : (
                    <Empty
                      title="Sua comunidade começa aqui"
                      text="Cadastre um plano e depois adicione seus alunos."
                    />
                  )}
                </section>
                <section className="motivation">
                  <span className="eyebrow">PEQUENOS PASSOS. GRANDES RESULTADOS.</span>
                  <h2>
                    A evolução
                    <br />
                    acontece
                    <br />
                    <em>todos os dias.</em>
                  </h2>
                  <p>
                    Uma rotina organizada abre espaço
                    <br />
                    para cuidar de quem importa.
                  </p>
                  <button
                    className="btn dark"
                    onClick={() => go(canTraining ? 'workouts' : 'checkins')}
                  >
                    {canTraining ? 'Organizar os treinos' : 'Acompanhar presenças'}
                    <ArrowUpRight size={17} />
                  </button>
                  <Dumbbell className="motivation-icon" size={120} />
                </section>
              </div>
            </>
          )}
          {page === 'members' && (
            <section className="panel">
              <div className="toolbar">
                <div className="search">
                  <Search size={18} />
                  <input
                    aria-label="Buscar aluno"
                    placeholder="Buscar por nome, e-mail ou telefone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="filter">
                  <SlidersHorizontal size={16} />
                  <select
                    aria-label="Filtrar situação"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Todas as situações</option>
                    <option value="active">Ativos</option>
                    <option value="paused">Pausados</option>
                    <option value="cancelled">Cancelados</option>
                  </select>
                </div>
                <button
                  className="btn secondary"
                  onClick={() =>
                    download(
                      'scar-alunos.csv',
                      csv([
                        ['Nome', 'E-mail', 'Telefone', 'Plano', 'Situação', 'Matrícula'],
                        ...filteredMembers.map((m) => [
                          m.name,
                          m.email,
                          m.phone,
                          plans.find((p) => p.id === m.plan_id)?.name,
                          labels[m.status],
                          m.joined_at,
                        ]),
                      ]),
                      'text/csv;charset=utf-8',
                    )
                  }
                >
                  <Download size={16} />
                  Exportar
                </button>
              </div>
              {filteredMembers.length ? (
                <Table headers={['Aluno', 'Contato', 'Plano', 'Vencimento', 'Situação', 'Ações']}>
                  {filteredMembers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <button className="person person-button" onClick={() => setProfile(m)}>
                          <span className={`avatar color-${m.id % 4}`}>{initials(m.name)}</span>
                          <span>
                            <strong>{m.name}</strong>
                            <small>#{String(m.id).padStart(4, '0')}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <div className="stack">
                          <span>{m.email || 'Sem e-mail'}</span>
                          <small>{m.phone || 'Sem telefone'}</small>
                        </div>
                      </td>
                      <td>{plans.find((p) => p.id === m.plan_id)?.name}</td>
                      <td>Dia {m.due_day}</td>
                      <td>
                        <Badge value={m.status} />
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="icon-btn"
                            onClick={() => setProfile(m)}
                            aria-label={`Ver ${m.name}`}
                          >
                            <ChevronRight size={17} />
                          </button>
                          {canFinance && (
                            <button
                              className="icon-btn"
                              onClick={() => open('members', m)}
                              aria-label={`Editar ${m.name}`}
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <Empty
                  title="Nenhum aluno encontrado"
                  text="Revise a busca ou cadastre um novo aluno. É necessário ter um plano cadastrado."
                />
              )}
              <div className="panel-foot">
                <small>{filteredMembers.length} aluno(s) encontrado(s)</small>
              </div>
            </section>
          )}
          {page === 'finance' && canFinance && (
            <>
              <div className="kpi-grid three">
                <Kpi
                  title="Recebido na competência"
                  value={money(received)}
                  detail="Baixas confirmadas manualmente"
                  icon={CheckCircle2}
                  accent
                />
                <Kpi
                  title="Em aberto"
                  value={money(pending)}
                  detail="Inclui valores vencidos"
                  icon={CircleDollarSign}
                />
                <Kpi
                  title="Vencido"
                  value={money(overdue.reduce((s, i) => s + i.amount, 0))}
                  detail={`${overdue.length} mensalidade(s)`}
                  icon={AlertCircle}
                />
              </div>
              <section className="panel">
                <div className="toolbar">
                  <div className="search">
                    <Search size={18} />
                    <input
                      aria-label="Buscar mensalidades"
                      placeholder="Buscar aluno…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="standalone-select"
                    aria-label="Situação da mensalidade"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Todas as situações</option>
                    {['open', 'overdue', 'paid', 'cancelled'].map((s) => (
                      <option key={s} value={s}>
                        {labels[s]}
                      </option>
                    ))}
                  </select>
                  <button className="btn secondary" onClick={exportFinance}>
                    <Download size={16} />
                    Exportar
                  </button>
                </div>
                {filteredInvoices.length ? (
                  <Table
                    headers={[
                      'Aluno / competência',
                      'Vencimento',
                      'Valor',
                      'Situação',
                      'Recebimento',
                      'Ações',
                    ]}
                  >
                    {filteredInvoices.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div className="stack">
                            <strong>{memberName(i.member_id)}</strong>
                            <small>{i.period.split('-').reverse().join('/')}</small>
                          </div>
                        </td>
                        <td>{fmtDate(i.due_date)}</td>
                        <td>
                          <strong>{money(i.amount)}</strong>
                        </td>
                        <td>
                          <Badge value={invoiceStatus(i)} />
                        </td>
                        <td>
                          {i.paid_at ? (
                            <div className="stack">
                              {fmtDate(i.paid_at)}
                              <small>{labels[i.method || '']}</small>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <div className="actions">
                            {i.status === 'open' && (
                              <>
                                <button
                                  className="btn compact secondary"
                                  onClick={() =>
                                    open('payment', { ...i, method: 'pix', paid_at: data.today })
                                  }
                                >
                                  Receber
                                </button>
                                <button
                                  className="icon-btn danger"
                                  title="Cancelar mensalidade"
                                  aria-label="Cancelar mensalidade"
                                  onClick={() => {
                                    if (confirm('Cancelar esta mensalidade?'))
                                      void action(() =>
                                        api(`/invoices/${i.id}`, 'PATCH', { status: 'cancelled' }),
                                      );
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                            {i.status === 'paid' && <CheckCircle2 className="success" size={19} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Table>
                ) : (
                  <Empty
                    title="Nenhuma mensalidade neste filtro"
                    text="Gere as mensalidades da competência para alunos ativos. A geração não duplica cobranças."
                  />
                )}
              </section>
              <p className="footnote">
                Controle interno de recebimentos. Não há integração automática com bancos, Pix ou
                operadoras de cartão.
              </p>
            </>
          )}
          {page === 'plans' && (
            <div className="plan-grid">
              {plans.map((p, index) => (
                <article className={`plan-card ${index === 1 ? 'featured' : ''}`} key={p.id}>
                  <div className="plan-top">
                    <span className="plan-icon">
                      <Dumbbell size={23} />
                    </span>
                    <span className="eyebrow">PLANO {String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h2>{p.name}</h2>
                  <div className="plan-price">
                    {money(p.price)}
                    <span>/mês</span>
                  </div>
                  <p>{p.description || 'Personalize os benefícios deste plano.'}</p>
                  <div className="plan-members">
                    <Users size={17} />
                    {members.filter((m) => m.plan_id === p.id && m.status === 'active').length}{' '}
                    alunos ativos
                  </div>
                  {user.role === 'admin' && (
                    <div className="plan-actions">
                      <button
                        className="btn secondary"
                        onClick={() => open('plans', { ...p, price: p.price / 100 })}
                      >
                        <Edit3 size={16} />
                        Editar plano
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => remove('plans', p.id)}
                        aria-label={`Excluir plano ${p.name}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {!plans.length && (
                <section className="panel">
                  <Empty
                    title="Crie seu primeiro plano"
                    text="Defina o valor mensal e os benefícios antes de cadastrar alunos."
                  />
                </section>
              )}
            </div>
          )}
          {page === 'classes' && (
            <>
              <div className="toolbar standalone">
                <div className="search">
                  <Search size={18} />
                  <input
                    aria-label="Buscar aula"
                    placeholder="Buscar aula ou professor…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="standalone-select"
                  aria-label="Período da agenda"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Próximas aulas</option>
                  <option value="today">Hoje</option>
                  <option value="past">Anteriores</option>
                </select>
              </div>
              <div className="class-grid">
                {classes
                  .filter(
                    (c) =>
                      (c.title + ' ' + c.instructor).toLowerCase().includes(search.toLowerCase()) &&
                      (filter === 'today'
                        ? c.date === data.today
                        : filter === 'past'
                          ? c.date < data.today
                          : c.date >= data.today),
                  )
                  .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
                  .map((c) => {
                    const booked = bookings.filter((b) => b.class_id === c.id).length;
                    return (
                      <article className="class-card" key={c.id}>
                        <div className="class-date">
                          <CalendarDays size={17} />
                          {fmtDate(c.date)}
                          <span>{c.time}</span>
                        </div>
                        <h2>{c.title}</h2>
                        <p>
                          {c.instructor} <span>· {c.duration} min</span>
                        </p>
                        <div className="occupancy">
                          <span>
                            {booked} de {c.capacity} vagas reservadas
                          </span>
                          <strong>{Math.max(0, c.capacity - booked)} livres</strong>
                        </div>
                        <div className="progress">
                          <i style={{ width: `${Math.min(100, (booked / c.capacity) * 100)}%` }} />
                        </div>
                        <div className="class-actions">
                          <button className="btn secondary" onClick={() => setClassId(c.id)}>
                            Participantes
                            <ChevronRight size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => open('classes', c)}
                            aria-label={`Editar ${c.title}`}
                          >
                            <Edit3 size={17} />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => remove('classes', c.id)}
                            aria-label={`Excluir ${c.title}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
              {!classes.length && (
                <section className="panel">
                  <Empty
                    title="Vamos preencher essa agenda?"
                    text="Adicione uma aula, escolha o professor e defina as vagas."
                  />
                </section>
              )}
            </>
          )}
          {page === 'checkins' && (
            <>
              <div className="kpi-grid three">
                <Kpi
                  title="Presenças hoje"
                  value={todayCheckins.length}
                  detail={fmtDate(data.today)}
                  icon={Fingerprint}
                  accent
                />
                <Kpi
                  title="Últimos 7 dias"
                  value={days.reduce((s, d) => s + d.value, 0)}
                  detail="Total de check-ins registrados"
                  icon={CalendarDays}
                />
                <Kpi
                  title="Alunos ativos"
                  value={active}
                  detail="Entrada sujeita à regularidade financeira"
                  icon={Users}
                />
              </div>
              <section className="panel">
                <div className="toolbar">
                  <div className="search">
                    <Search size={18} />
                    <input
                      aria-label="Buscar presença"
                      placeholder="Buscar aluno…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="standalone-select"
                    value={filter}
                    aria-label="Filtrar presenças"
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Todo o histórico</option>
                    <option value="today">Hoje</option>
                  </select>
                </div>
                {checkins.length ? (
                  <Table headers={['Aluno', 'Data', 'Horário', 'Registro']}>
                    {checkins
                      .filter(
                        (c) =>
                          memberName(c.member_id).toLowerCase().includes(search.toLowerCase()) &&
                          (filter === 'all' || c.date === data.today),
                      )
                      .map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong>{memberName(c.member_id)}</strong>
                          </td>
                          <td>{fmtDate(c.date)}</td>
                          <td>{c.time}</td>
                          <td>
                            <span className="badge active">
                              <Check size={12} />
                              Entrada registrada
                            </span>
                          </td>
                        </tr>
                      ))}
                  </Table>
                ) : (
                  <Empty
                    title="Nenhuma entrada registrada"
                    text="Registre o primeiro check-in da academia."
                  />
                )}
              </section>
            </>
          )}
          {page === 'workouts' && canTraining && (
            <>
              <div className="toolbar standalone">
                <div className="search">
                  <Search size={18} />
                  <input
                    aria-label="Buscar ficha"
                    placeholder="Buscar ficha ou aluno…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="workout-grid">
                {workouts
                  .filter((w) =>
                    (w.title + ' ' + memberName(w.member_id))
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((w) => (
                    <article className="workout-card" key={w.id}>
                      <div className="workout-top">
                        <span className="workout-icon">
                          <Dumbbell size={24} />
                        </span>
                        <span
                          className={`badge ${w.valid_until < data.today ? 'overdue' : 'active'}`}
                        >
                          {w.valid_until < data.today ? 'Revisar ficha' : 'Vigente'}
                        </span>
                      </div>
                      <small>{memberName(w.member_id)}</small>
                      <h2>{w.title}</h2>
                      <p>{w.goal || 'Objetivo não informado'}</p>
                      <div className="workout-meta">
                        <span>{w.exercises.length} exercícios</span>
                        <span>Até {fmtDate(w.valid_until)}</span>
                      </div>
                      <div className="class-actions">
                        <button className="btn secondary" onClick={() => setViewWorkout(w)}>
                          Ver ficha
                          <ChevronRight size={16} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => open('workouts', w)}
                          aria-label={`Editar ${w.title}`}
                        >
                          <Edit3 size={17} />
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => remove('workouts', w.id)}
                          aria-label={`Excluir ${w.title}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
              {!workouts.length && (
                <section className="panel">
                  <Empty
                    title="O próximo treino começa aqui"
                    text="Crie fichas individuais com exercícios, séries, repetições e cargas."
                  />
                </section>
              )}
            </>
          )}
          {page === 'assessments' && canTraining && (
            <section className="panel">
              <div className="toolbar">
                <div>
                  <h2>Evolução individual</h2>
                  <p className="muted">Selecione um aluno para acompanhar suas medidas.</p>
                </div>
                <select
                  className="standalone-select"
                  value={assessmentMember}
                  onChange={(e) => setAssessmentMember(e.target.value)}
                  aria-label="Filtrar avaliações por aluno"
                >
                  <option value="">Todos os alunos</option>
                  {members.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              {assessmentMember &&
                (() => {
                  const history = assessments
                    .filter((a) => a.member_id === Number(assessmentMember))
                    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
                  if (!history.length) return null;
                  const first = history[0],
                    last = history[history.length - 1];
                  return (
                    <div className="assessment-summary">
                      <div>
                        <small>Último peso registrado</small>
                        <strong>{last.weight} kg</strong>
                      </div>
                      <div>
                        <small>Variação desde {fmtDate(first.date)}</small>
                        <strong>{(last.weight - first.weight).toFixed(1)} kg</strong>
                      </div>
                      <div>
                        <small>Avaliações registradas</small>
                        <strong>{history.length}</strong>
                      </div>
                    </div>
                  );
                })()}
              {assessments.length ? (
                <Table headers={['Aluno', 'Data', 'Peso', 'Altura', 'Cintura', 'Gordura', 'Ações']}>
                  {assessments
                    .filter((a) => !assessmentMember || a.member_id === Number(assessmentMember))
                    .map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{memberName(a.member_id)}</strong>
                          {a.notes && <small className="cell-note">{a.notes}</small>}
                        </td>
                        <td>{fmtDate(a.date)}</td>
                        <td>{a.weight} kg</td>
                        <td>{a.height} cm</td>
                        <td>{a.waist === null ? '—' : `${a.waist} cm`}</td>
                        <td>{a.body_fat === null ? '—' : `${a.body_fat}%`}</td>
                        <td>
                          <div className="actions">
                            <button
                              className="icon-btn"
                              aria-label="Editar avaliação"
                              onClick={() => open('assessments', a)}
                            >
                              <Edit3 size={17} />
                            </button>
                            <button
                              className="icon-btn danger"
                              aria-label="Excluir avaliação"
                              onClick={() => remove('assessments', a.id)}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </Table>
              ) : (
                <Empty
                  title="Acompanhe a evolução dos alunos"
                  text="Registre peso, altura, cintura e percentual de gordura."
                />
              )}
            </section>
          )}
          {page === 'reports' && canFinance && (
            <>
              <div className="kpi-grid three">
                <Kpi
                  title="Recebido na competência"
                  value={money(received)}
                  detail="Mensalidades da competência selecionada"
                  icon={CircleDollarSign}
                  accent
                />
                <Kpi
                  title="Taxa de recebimento"
                  value={`${Math.round((received / Math.max(1, received + pending)) * 100)}%`}
                  detail="Valor pago / valor não cancelado"
                  icon={Activity}
                />
                <Kpi
                  title="Receita mensal potencial"
                  value={money(
                    members
                      .filter((m) => m.status === 'active')
                      .reduce((s, m) => s + (plans.find((p) => p.id === m.plan_id)?.price ?? 0), 0),
                  )}
                  detail="Alunos ativos × valor atual dos planos"
                  icon={Users}
                />
              </div>
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Distribuição por plano</h2>
                    <p>Alunos ativos e receita mensal potencial</p>
                  </div>
                </div>
                <Table headers={['Plano', 'Alunos ativos', 'Mensalidade', 'Receita potencial']}>
                  {plans.map((p) => {
                    const n = members.filter(
                      (m) => m.plan_id === p.id && m.status === 'active',
                    ).length;
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                        </td>
                        <td>
                          <div className="report-bar">
                            <i style={{ width: `${(n / Math.max(1, active)) * 100}%` }} />
                            <span>{n}</span>
                          </div>
                        </td>
                        <td>{money(p.price)}</td>
                        <td>{money(n * p.price)}</td>
                      </tr>
                    );
                  })}
                </Table>
                <div className="panel-foot">
                  <span>Valores potenciais não representam dinheiro recebido.</span>
                  <button className="btn secondary" onClick={exportFinance}>
                    <Download size={16} />
                    Financeiro em CSV
                  </button>
                </div>
              </section>
              <section className="panel export-panel">
                <div>
                  <h2>Histórico de frequência</h2>
                  <p>Exporte os check-ins para analisar a assiduidade.</p>
                </div>
                <button
                  className="btn secondary"
                  onClick={() =>
                    download(
                      'scar-frequencia.csv',
                      csv([
                        ['Aluno', 'Data', 'Horário'],
                        ...checkins.map((c) => [memberName(c.member_id), c.date, c.time]),
                      ]),
                      'text/csv;charset=utf-8',
                    )
                  }
                >
                  <Download size={16} />
                  Exportar presenças
                </button>
              </section>
            </>
          )}
          {page === 'settings' && user.role === 'admin' && (
            <>
              <section className="panel settings-panel">
                <div className="panel-head">
                  <div>
                    <h2>Identidade da academia</h2>
                    <p>Informações exibidas no painel e nas fichas.</p>
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(() => api('/settings', 'PATCH', settings), 'Configurações salvas.');
                  }}
                >
                  <div className="form-grid">
                    <label className="full">
                      Nome da academia
                      <input
                        required
                        maxLength={120}
                        value={settings.name}
                        onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      />
                    </label>
                    <label>
                      E-mail
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      />
                    </label>
                    <label>
                      Telefone
                      <input
                        value={settings.phone}
                        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      />
                    </label>
                  </div>
                  <button className="btn primary" disabled={busy}>
                    <Check size={16} />
                    Salvar alterações
                  </button>
                </form>
              </section>
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Equipe e acessos</h2>
                    <p>Administradores, recepcionistas e professores.</p>
                  </div>
                  <button className="btn secondary" onClick={() => open('users')}>
                    <Plus size={16} />
                    Novo acesso
                  </button>
                </div>
                <Table headers={['Nome', 'E-mail', 'Perfil', 'Acesso', 'Ações']}>
                  {data.users?.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                      </td>
                      <td>{u.email}</td>
                      <td>{roleNames[u.role]}</td>
                      <td>
                        <Badge value={u.active ? 'active' : 'paused'} />
                      </td>
                      <td>
                        {u.id !== user.id && (
                          <button
                            className="btn secondary compact"
                            disabled={busy}
                            onClick={() =>
                              void action(() =>
                                api(`/users/${u.id}`, 'PATCH', { active: u.active ? 0 : 1 }),
                              )
                            }
                          >
                            {u.active ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </Table>
              </section>
              <section className="panel export-panel">
                <div>
                  <h2>Exportação dos dados</h2>
                  <p>Baixe um JSON dos registros operacionais. Não inclui senhas ou sessões.</p>
                  <small>
                    Para recuperação completa, mantenha também um backup do banco SQLite.
                  </small>
                </div>
                <button
                  className="btn secondary"
                  onClick={() =>
                    void action(
                      async () =>
                        download(
                          `scar-dados-${data.today}.json`,
                          JSON.stringify(await api('/export'), null, 2),
                        ),
                      'Exportação preparada.',
                    )
                  }
                >
                  <Download size={16} />
                  Exportar dados
                </button>
              </section>
            </>
          )}
          <footer className="app-footer">
            <span>
              SCAR <b>·</b> GESTÃO FITNESS
            </span>
            <span>Organização que gera movimento.</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {notice}
        </div>
      )}
      {editor && (
        <Editor
          key={editor.entity + String(editor.initial.id ?? 'new')}
          entity={editor.entity}
          initial={editor.initial}
          data={data}
          onClose={() => {
            if (!busy) setEditor(null);
          }}
          onSubmit={save}
          busy={busy}
        />
      )}
      {profile && (
        <Modal title={profile.name} onClose={() => setProfile(null)}>
          <div className="profile-body">
            <div className="profile-hero">
              <span className="avatar large">{initials(profile.name)}</span>
              <div>
                <Badge value={profile.status} />
                <p>
                  {plans.find((p) => p.id === profile.plan_id)?.name} · vencimento dia{' '}
                  {profile.due_day}
                </p>
              </div>
            </div>
            <dl>
              <div>
                <dt>E-mail</dt>
                <dd>{profile.email || 'Não informado'}</dd>
              </div>
              <div>
                <dt>Celular</dt>
                <dd>{profile.phone || 'Não informado'}</dd>
              </div>
              <div>
                <dt>Nascimento</dt>
                <dd>{fmtDate(profile.birth_date)}</dd>
              </div>
              <div>
                <dt>Matrícula</dt>
                <dd>{fmtDate(profile.joined_at)}</dd>
              </div>
            </dl>
            {profile.notes && <p className="profile-notes">{profile.notes}</p>}
            <div className="profile-stats">
              <div>
                <strong>{checkins.filter((c) => c.member_id === profile.id).length}</strong>
                <small>Presenças</small>
              </div>
              {canTraining && (
                <div>
                  <strong>{workouts.filter((w) => w.member_id === profile.id).length}</strong>
                  <small>Fichas de treino</small>
                </div>
              )}
              {canFinance && (
                <div>
                  <strong>
                    {money(
                      invoices
                        .filter((i) => i.member_id === profile.id && i.status === 'open')
                        .reduce((s, i) => s + i.amount, 0),
                    )}
                  </strong>
                  <small>Em aberto</small>
                </div>
              )}
            </div>
            <div className="profile-actions">
              {canFinance && (
                <button
                  className="btn primary"
                  onClick={() => {
                    open('members', profile);
                    setProfile(null);
                  }}
                >
                  Editar cadastro
                  <Edit3 size={16} />
                </button>
              )}
              {canTraining && (
                <button
                  className="btn secondary"
                  onClick={() => {
                    open('workouts', { member_id: profile.id });
                    setProfile(null);
                  }}
                >
                  Criar ficha
                  <Dumbbell size={16} />
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {viewWorkout && (
        <Modal title={viewWorkout.title} onClose={() => setViewWorkout(null)} wide>
          <div className="print-sheet">
            <div className="print-heading">
              <strong>{data.settings.name}</strong>
              <small>SCAR • FICHA DE TREINO</small>
            </div>
            <p>
              <strong>Aluno:</strong> {memberName(viewWorkout.member_id)}
            </p>
            <p>
              <strong>Objetivo:</strong> {viewWorkout.goal || '—'} · <strong>Validade:</strong>{' '}
              {fmtDate(viewWorkout.valid_until)}
            </p>
            <Table headers={['Exercício', 'Séries', 'Repetições', 'Carga', 'Descanso']}>
              {viewWorkout.exercises.map((e, i) => (
                <tr key={i}>
                  <td>
                    <strong>{e.name}</strong>
                  </td>
                  <td>{e.sets}</td>
                  <td>{e.reps}</td>
                  <td>{e.load || '—'}</td>
                  <td>{e.rest || '—'}</td>
                </tr>
              ))}
            </Table>
            {viewWorkout.notes && <p className="profile-notes">{viewWorkout.notes}</p>}
          </div>
          <footer className="modal-footer">
            <button className="btn secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Imprimir / salvar PDF
            </button>
            <button
              className="btn primary"
              onClick={() => {
                open('workouts', viewWorkout);
                setViewWorkout(null);
              }}
            >
              <Edit3 size={16} />
              Editar ficha
            </button>
          </footer>
        </Modal>
      )}
      {selectedClass && (
        <Modal title={selectedClass.title} onClose={() => setClassId(null)}>
          <div className="class-participants">
            <p>
              {fmtDate(selectedClass.date)} às {selectedClass.time} · {selectedClass.instructor}
            </p>
            <h3>
              Participantes · {bookings.filter((b) => b.class_id === classId).length}/
              {selectedClass.capacity}
            </h3>
            {bookings
              .filter((b) => b.class_id === classId)
              .map((b) => (
                <div className="participant" key={b.id}>
                  <span>{memberName(b.member_id)}</span>
                  <button
                    aria-label={`Cancelar reserva de ${memberName(b.member_id)}`}
                    className="icon-btn danger"
                    onClick={() => remove('bookings', b.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            {!bookings.some((b) => b.class_id === classId) && (
              <Empty title="Ainda há espaço" text="Adicione os alunos à lista da aula." />
            )}
          </div>
          <footer className="modal-footer">
            <button
              className="btn primary"
              onClick={() => {
                open('booking', { class_id: selectedClass.id });
                setClassId(null);
              }}
              disabled={
                selectedClass.date < data.today ||
                bookings.filter((b) => b.class_id === classId).length >= selectedClass.capacity
              }
            >
              <Plus size={16} />
              Adicionar participante
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
