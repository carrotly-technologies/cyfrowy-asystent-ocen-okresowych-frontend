import { Check } from 'lucide-react'
import { Link } from 'react-router'
import { cx } from './cx'
import s from './StageStepper.module.css'

export type StageStepStatus = 'done' | 'current' | 'todo'

export type StageStep = {
  key: string
  label: string
  status: StageStepStatus
  /** Link target; without it the step is plain text. */
  to?: string
  /** Secondary line under the name in smaller, muted text (e.g. the date of the step). */
  sublabel?: string
}

type Props = {
  steps: StageStep[]
  /** The step shown on the page (gets aria-current="step"); by default the current one. */
  activeKey?: string
  /** Accessible name of the list, e.g. "Etapy oceny". */
  label: string
}

const STATUS_TEXT: Record<StageStepStatus, string> = {
  done: 'zakończono',
  current: 'w toku',
  todo: 'nierozpoczęty',
}

/**
 * Horizontal process stepper: circles joined by a line, the stage name under each circle. Done steps are
 * green circles with a white check (the line leading to them is green), the current step is an accent
 * outline with its number, future steps are grey outlines. The step on screen carries aria-current="step"
 * and a ring around its circle. Each step is a link, so the whole stepper works with Tab / Enter.
 * When the stepper itself is narrow (phone, or the assistant panel open next to it) only the circles stay,
 * with the name of the shown step under the line, without horizontal scrolling. A stepper of four steps or fewer
 * keeps the names down to a much smaller width than one of seven.
 */
export function StageStepper({ steps, activeKey, label }: Props) {
  const active = activeKey ?? steps.find((st) => st.status === 'current')?.key
  const activeIndex = steps.findIndex((st) => st.key === active)
  return (
    <nav className={cx(s.root, steps.length <= 4 && s.few)} aria-label={label}>
      <ol className={s.list}>
        {steps.map((st, i) => {
          const isActive = st.key === active
          // the line into this step is green once the previous step is done and this one has been reached
          const reached = i > 0 && steps[i - 1].status === 'done' && st.status !== 'todo'
          const content = (
            <>
              <span className={s.marker} aria-hidden="true">
                {st.status === 'done' ? <Check size={18} strokeWidth={3} /> : i + 1}
              </span>
              <span className={s.label}>{st.label}</span>
              {st.sublabel && <span className={cx(s.sublabel, 'num')}>{st.sublabel}</span>}
              <span className="visually-hidden">
                {`, krok ${i + 1} z ${steps.length}, ${STATUS_TEXT[st.status]}`}
              </span>
            </>
          )
          const title = st.sublabel ? `${st.label}: ${st.sublabel}` : st.label
          const cls = cx(s.step, s[st.status], isActive && s.active)
          return (
            <li key={st.key} className={cx(s.item, reached && s.reached)}>
              {st.to ? (
                <Link to={st.to} className={cls} aria-current={isActive ? 'step' : undefined} title={title}>
                  {content}
                </Link>
              ) : (
                <span className={cls} aria-current={isActive ? 'step' : undefined} title={title}>
                  {content}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      {activeIndex >= 0 && (
        <p className={s.caption} aria-hidden="true">
          Krok {activeIndex + 1} z {steps.length}: <strong>{steps[activeIndex].label}</strong>
        </p>
      )}
    </nav>
  )
}
