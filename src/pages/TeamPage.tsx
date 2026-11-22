import { useQuery } from '@tanstack/react-query'
import { getTeam, type CaseSummary, type Role } from '../api/cases'
import { CaseActionLink } from '../components/CaseActionLink'
import { DeadlineText } from '../components/Deadline'
import { ErrorState, LoadingState } from '../components/QueryState'
import { StageDots } from '../components/StageDots'
import { ResultTable, ResultTableRow, type ResultTableColumn, type ResultTone } from '../components/ui'
import { useMe } from '../lib/useAuth'
import { countLabel, fmtDate } from '../lib/format'
import { CASE_STATUS_LABEL, STAGE_SHORT } from '../lib/stages'

export function TeamPage() {
  const team = useQuery({ queryKey: ['team'], queryFn: ({ signal }) => getTeam(signal) })
  const me = useMe()

  if (team.isPending) return <div className="page"><LoadingState /></div>
  if (team.isError) return <div className="page"><ErrorState error={team.error} what="lista zespołu" onRetry={() => team.refetch()} /></div>

  const { cases } = team.data

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="h-page">Oceny zespołu</h1>
          <p className="page-head__meta" title={me.unit}>{me.unit}</p>
        </div>
      </header>

      <section className="section" aria-labelledby="team-h">
        <div className="section__head">
          <h2 id="team-h" className="h-section">Pracownicy</h2>
          <span className="faint small">{countLabel(cases.length, 'osoba', 'osoby', 'osób')}</span>
        </div>
        <ResultTable label="Pracownicy i ich oceny okresowe" columns={COLUMNS}>
          {cases.map((c) => (
            <TeamRow key={c.id} c={c} role={me.role} />
          ))}
        </ResultTable>
      </section>
    </div>
  )
}

const COLUMNS: ResultTableColumn[] = [
  { label: 'Pracownik', width: 'minmax(0, 1.4fr)' },
  { label: 'Stanowisko', width: 'minmax(0, 1.2fr)' },
  { label: 'Ocena', width: 'minmax(0, 1fr)' },
  { label: 'Etap', width: 'minmax(0, 1fr)' },
  { label: 'Termin', width: 'minmax(0, 1.1fr)' },
  { label: 'Następna ocena', width: 'minmax(0, 0.9fr)' },
  { label: 'Status', width: '7.5rem' },
]

/** Status block: overdue first (red), then the case status (closed = grey, waiting for others = blue, running = green). */
function statusOf(c: CaseSummary): { label: string; sub?: string; tone: ResultTone } {
  const label = CASE_STATUS_LABEL[c.status]
  if (c.status === 'ZAKONCZONA') return { label, tone: 'neutral' }
  if (c.nextDeadline?.state === 'OVERDUE') return { label: 'Po terminie', sub: label, tone: 'danger' }
  if (c.status === 'OKRES_SPRZECIWU' || c.status === 'DO_ZAPOZNANIA' || c.status === 'SPRZECIW_W_ROZPATRZENIU') return { label, tone: 'accent' }
  return { label, tone: 'ok' }
}

function TeamRow({ c, role }: { c: CaseSummary; role: Role }) {
  const current = c.stages.find((s) => s.id === c.currentStage)
  const idx = c.stages.findIndex((s) => s.id === c.currentStage)
  const sheet = c.sheetId ? `arkusz ${c.sheetId}` : 'arkusz do ustalenia'
  const stageName = current ? STAGE_SHORT[current.id] : '—'
  const name = `${c.person.firstName} ${c.person.lastName}`
  const [title, position, assessment, stage, deadline, next, status] = COLUMNS.map((col) => col.label)
  return (
    <ResultTableRow
      to={`/zespol/${encodeURIComponent(c.person.id)}`}
      linkLabel={`Pokaż pracownika: ${name}`}
      actions={<CaseActionLink caseId={c.id} status={c.status} role={role} name={name} small />}
      title={name}
      titleLabel={title}
      status={statusOf(c)}
      statusLabel={status}
      cells={[
        { label: position, value: c.person.position },
        { label: assessment, value: `okresowa, ${sheet}` },
        {
          label: stage,
          value: (
            <>
              <span>{`${idx + 1}/${c.stages.length} ${stageName}`}</span>
              <StageDots stages={c.stages} />
            </>
          ),
        },
        {
          label: deadline,
          value: c.nextDeadline ? (
            <>
              <DeadlineText deadline={c.nextDeadline} />
              <span className="small muted">{c.nextDeadline.label.replace(/,?\s+do$/, '')}</span>
            </>
          ) : (
            <span className="faint">—</span>
          ),
        },
        { label: next, value: <span className="num">{fmtDate(c.nextEvaluationDueOn)}</span> },
      ]}
    />
  )
}
