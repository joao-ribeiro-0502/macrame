import { useEffect, useState } from 'react';
import { AlertTriangle, Info, KeyRound, MonitorCog, Package, RotateCcw, ShieldCheck } from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { useToast } from '@/store/ToastContext';
import { DEMO_CREDENTIALS } from '@/store/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox, Field, Input, Switch } from '@/components/ui/Form';
import { ConfirmDialog } from '@/components/ui/Modal';
import { settingsSchema } from '@/lib/validation';
import { BRANDS } from '@/data/brands';
import type { Settings } from '@/types';

export function SettingsPage() {
  const { state, dispatch } = useDemo();
  const { push } = useToast();

  const [draft, setDraft] = useState<Settings>(state.settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetOpen, setResetOpen] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    setDraft(state.settings);
  }, [state.settings]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '', criticalThreshold: '', _form: '' }));
  }

  function save() {
    const parsed = settingsSchema.safeParse({
      alertThreshold: Number(draft.alertThreshold),
      criticalThreshold: Number(draft.criticalThreshold),
      physicalStoreReserve: Number(draft.physicalStoreReserve),
      priorityChannels: draft.priorityChannels,
      notificationsEnabled: draft.notificationsEnabled,
      compactTables: draft.compactTables,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0] ?? '_form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      push({
        tone: 'error',
        title: 'Configurações inválidas',
        description: 'Corrija os campos destacados antes de salvar.',
      });
      return;
    }

    const next: Settings = {
      ...draft,
      alertThreshold: parsed.data.alertThreshold,
      criticalThreshold: parsed.data.criticalThreshold,
      physicalStoreReserve: parsed.data.physicalStoreReserve,
      priorityChannels: parsed.data.priorityChannels.filter((id) => state.channels.some((channel) => channel.id === id)),
    };
    dispatch({ type: 'SETTINGS_SAVE', settings: next });
    push({
      tone: 'success',
      title: 'Configurações salvas',
      description: 'Estoque, alertas e distribuição já refletem os novos valores.',
    });
  }

  function togglePriority(channelId: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      priorityChannels: checked
        ? [...current.priorityChannels, channelId]
        : current.priorityChannels.filter((id) => id !== channelId),
    }));
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings);

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Regras de negócio da demonstração — salvas no navegador (localStorage)."
        actions={
          dirty ? (
            <Badge tone="warning">Alterações não salvas</Badge>
          ) : (
            <Badge tone="positive">Tudo salvo</Badge>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Estoque */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <Package aria-hidden className="h-4 w-4 text-terracotta" />
                Estoque
              </CardTitle>
              <CardDescription>
                Limites usados pelo dashboard, estoque, relatórios e regras de publicação.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Limite de alerta (estoque baixo)"
                htmlFor="settings-alert"
                error={errors.alertThreshold}
                hint="Estoque ≤ este valor gera alerta."
              >
                <Input
                  id="settings-alert"
                  type="number"
                  min="0"
                  max="500"
                  step="1"
                  invalid={Boolean(errors.alertThreshold)}
                  value={draft.alertThreshold}
                  onChange={(event) => update('alertThreshold', Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
                />
              </Field>
              <Field
                label="Limite crítico"
                htmlFor="settings-critical"
                error={errors.criticalThreshold}
                hint="Estoque ≤ este valor aplica a regra de prioridade."
              >
                <Input
                  id="settings-critical"
                  type="number"
                  min="0"
                  max="500"
                  step="1"
                  invalid={Boolean(errors.criticalThreshold)}
                  value={draft.criticalThreshold}
                  onChange={(event) => update('criticalThreshold', Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
                />
              </Field>
            </div>

            {errors.criticalThreshold ? (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-xs leading-relaxed text-critical">
                <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                O limite crítico precisa ser menor ou igual ao limite de alerta. Caso contrário, um
                produto poderia estar “crítico” sem antes ter passado pelo estado “baixo”, quebrando a
                sequência de alertas.
              </p>
            ) : null}

            <fieldset>
              <legend className="mb-2 text-xs font-medium text-ink-soft">Canais prioritários (distribuição simulada)</legend>
              <p className="mb-3 text-[11px] text-ink-muted">
                As duas marcas possuem 4 canais cada (Nuvemshop, Mercado Livre, Shopee e TikTok Shop).
              </p>
              <div className="space-y-3">
                {BRANDS.map((brand) => (
                  <div key={brand.id}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brand.accent }} />
                      {brand.name}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {state.channels
                        .filter((channel) => channel.brandId === brand.id)
                        .map((channel) => (
                          <Checkbox
                            key={channel.id}
                            id={`settings-priority-${channel.id}`}
                            label={channel.name.split(' — ')[1] ?? channel.name}
                            description={channel.enabled ? 'Habilitado' : 'Desabilitado na demo'}
                            checked={draft.priorityChannels.includes(channel.id)}
                            disabled={!channel.enabled}
                            onChange={(event) => togglePriority(channel.id, event.target.checked)}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <Field
              label="Reserva manual para loja física"
              htmlFor="settings-reserve"
              error={errors.physicalStoreReserve}
              hint="Recurso de planejamento informativo — a loja física não é integrada na V1."
            >
              <Input
                id="settings-reserve"
                type="number"
                min="0"
                max="200"
                step="1"
                invalid={Boolean(errors.physicalStoreReserve)}
                value={draft.physicalStoreReserve}
                onChange={(event) => update('physicalStoreReserve', Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Interface + demonstração */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <MonitorCog aria-hidden className="h-4 w-4 text-terracotta" />
                  Interface
                </CardTitle>
                <CardDescription>Preferências visuais desta demonstração.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Notificações da demonstração</p>
                  <p className="text-[11px] text-ink-muted">Exibe avisos visuais (toasts) após ações.</p>
                </div>
                <Switch
                  checked={draft.notificationsEnabled}
                  onChange={(checked) => update('notificationsEnabled', checked)}
                  label="Ativar notificações da demonstração"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Tabelas compactas</p>
                  <p className="text-[11px] text-ink-muted">Reduz o espaçamento das linhas nas tabelas.</p>
                </div>
                <Switch
                  checked={draft.compactTables}
                  onChange={(checked) => update('compactTables', checked)}
                  label="Ativar tabelas compactas"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <ShieldCheck aria-hidden className="h-4 w-4 text-terracotta" />
                  Demonstração
                </CardTitle>
                <CardDescription>Recursos do protótipo e seus limites.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={() => setResetOpen(true)} className="w-full">
                <RotateCcw aria-hidden className="h-4 w-4" />
                Restaurar dados iniciais da demonstração
              </Button>
              <Button variant="outline" onClick={() => setShowCredentials((value) => !value)} className="w-full">
                <KeyRound aria-hidden className="h-4 w-4" />
                {showCredentials ? 'Ocultar credenciais' : 'Ver credenciais demonstrativas'}
              </Button>
              {showCredentials ? (
                <div className="rounded-md border border-border bg-cream/60 px-3.5 py-3 font-mono text-xs text-ink">
                  Login: {DEMO_CREDENTIALS.login}
                  <br />
                  Senha: {DEMO_CREDENTIALS.password}
                </div>
              ) : null}
              <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info-soft px-3.5 py-3 text-[11px] leading-relaxed text-info">
                <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Este protótipo é 100% front-end: os dados vivem no seu navegador. O acesso por senha é
                  apenas uma barreira visual para a apresentação e <strong>não é adequado para dados reais</strong>.
                  Nenhuma integração com marketplaces, bancos ou emissores fiscais existe.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={!dirty}
          onClick={() => {
            setDraft(state.settings);
            setErrors({});
          }}
        >
          Descartar alterações
        </Button>
        <Button onClick={save} disabled={!dirty}>
          Salvar configurações
        </Button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          dispatch({ type: 'RESET' });
          setResetOpen(false);
          push({ tone: 'success', title: 'Demonstração restaurada', description: 'Dados fictícios voltaram ao estado inicial.' });
        }}
        title="Restaurar dados iniciais"
        confirmLabel="Restaurar"
        message={
          <span>
            Produtos, pedidos, estoque, canais, financeiro, atividades e configurações voltarão ao
            estado inicial da demonstração. <strong className="text-ink">Sua sessão de acesso será mantida.</strong>
          </span>
        }
      />
    </>
  );
}
