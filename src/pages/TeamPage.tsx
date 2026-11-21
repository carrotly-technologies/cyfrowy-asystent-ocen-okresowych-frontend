import { useQuery } from '@tanstack/react-query'
import { getTeam, type CaseSummary } from '../api/cases'
import { DeadlineText } from '../components/Deadline'
import { ErrorState, LoadingState } from '../components/QueryState'
import { StageDots } from '../components/StageDots'
import { ResultList, ResultRow, type ResultTone } from '../components/ui'
import { useMe } from '../lib/useAuth'
import { countLabel } from '../lib/format'
import { caseUrl, CASE_STATUS_LABEL, STAGE_SHORT } from '../lib/stages'

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
          <h1 className="h-page">Mój zespół</h1>
          <p className="page-head__meta" title={me.unit}>{me.unit}</p>
        </div>
      </header>

      <section className="section" aria-labelledby="team-h">
        <div className="section__head">
          <h2 id="team-h" className="h-section">Pracownicy</h2>
          <span className="faint small">{countLabel(cases.length, 'osoba', 'osoby', 'osób')}</span>
        </div>
        <ResultList label="Pracownicy i ich oceny okresowe">
          {cases.map((c) => (
            <TeamRow key={c.id} c={c} />
          ))}
        </ResultList>
      </section>
    </div>
  )
}

/** Status block: overdue first (red), then the case status (closed = grey, waiting for others = blue, running = green). */
function statusOf(c: CaseSummary): { label: string; sub?: string; tone: ResultTone } {
  const label = CASE_STATUS_LABEL[c.status]
  if (c.status === 'ZAKONCZONA') return { label, tone: 'neutral' }
  if (c.nextDeadline?.state === 'OVERDUE') return { label: 'Po terminie', sub: label, tone: 'danger' }
  if (c.status === 'OKRES_SPRZECIWU' || c.status === 'DO_ZAPOZNANIA' || c.status === 'SPRZECIW_W_ROZPATRZENIU') return { label, tone: 'accent' }
  return { label, tone: 'ok' }
}

function TeamRow({ c }: { c: CaseSummary }) {
  const current = c.stages.find((s) => s.id === c.currentStage)
  const idx = c.stages.findIndex((s) => s.id === c.currentStage)
  const sheet = c.sheetId ? `arkusz ${c.sheetId}` : 'arkusz do ustalenia'
  const stageName = current ? STAGE_SHORT[current.id] : '—'
  const name = `${c.person.firstName} ${c.person.lastName}`
  return (
    <ResultRow
      to={caseUrl(c.id)}
      linkLabel={`Otwórz teczkę: ${name}`}
      title={name}
      status={statusOf(c)}
      meta={[
        { label: 'Stanowisko', value: c.person.position },
        { label: 'Ocena', value: `okresowa, ${sheet}` },
        { label: 'Etap', value: `${idx + 1}/${c.stages.length} ${stageName}` },
      ]}
      aside={
        c.nextDeadline ? (
          <>
            <DeadlineText deadline={c.nextDeadline} />
            <span className="small muted">{c.nextDeadline.label.replace(/,?\s+do$/, '')}</span>
          </>
        ) : undefined
      }
    >
      <div className="result-dots">
        <StageDots stages={c.stages} />
      </div>
    </ResultRow>
  )
}
