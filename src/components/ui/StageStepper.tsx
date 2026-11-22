import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from './cx'
import s from './StageStepper.module.css'

export type StageStepStatus = 'done' | 'current' | 'todo'

export type StageStep = {
  key: string
  label: string
  /** Shorter name shown under the circle (e.g. one word); the full `label` stays in the tooltip and for screen readers. */
  shortLabel?: string
  status: StageStepStatus
  /** Link target; without it the step is plain text. */
  to?: string
  /** Secondary line under the name in smaller, muted text (e.g. the date of the step). */
  sublabel?: string
  /** Vertical stepper only: content expanded under the step, indented next to the line (e.g. the current step's action). */
  body?: ReactNode
}

type Props = {
  steps: StageStep[]
  /** The step shown on the page (gets aria-current="step"); by default the current one. */
  activeKey?: string
  /** Accessible name of the list, e.g. "Etapy oceny". */
  label: string
  /** `vertical`: the circles on a vertical line, the name and sublabel next to each circle, `body` under its step. */
  orientation?: 'horizontal' | 'vertical'
}

const STATUS_TEXT: Record<StageStepStatus, string> = {
  done: 'zakończono',
  current: 'w toku',
  todo: 'nierozpoczęty',
}

/**
 * Process stepper, horizontal by default: circles joined by a line, the stage name under each circle. Done steps are
 * green circles with a white check (the line leading to them is green), the current step is an accent
 * outline with its number, future steps are grey outlines. The step on screen carries aria-current="step"
 * and a ring around its circle. Each step is a link, so the whole stepper works with Tab / Enter.
 * When the stepper itself is narrow (phone, or the assistant panel open next to it) only the circles stay,
 * with the name of the shown step under the line, without horizontal scrolling. A stepper of four steps or fewer
 * keeps the names down to a much smaller width than one of seven.
 * The vertical variant has the same circles, check, colours and line, running down; a step's `body` is expanded under
 * it next to the line (the steps of „Podpis i przekazanie” and „Zapoznanie z oceną”, with the current step's action).
 */
export function StageStepper({ steps, activeKey, label, orientation = 'horizontal' }: Props) {
  const active = activeKey ?? steps.find((st) => st.status === 'current')?.key
  const activeIndex = steps.findIndex((st) => st.key === active)
  const vertical = orientation === 'vertical'
  // the line into a step is green once the previous step is done and this one has been reached
  const isReached = (i: number) => i > 0 && i < steps.length && steps[i - 1].status === 'done' && steps[i].status !== 'todo'
  const list = (
    <ol className={s.list} aria-label={vertical ? label : undefined}>
      {steps.map((st, i) => {
        const isActive = st.key === active
        // horizontal: the line comes into this step from the left; vertical: it leaves this step down to the next one
        const reached = vertical ? isReached(i + 1) : isReached(i)
        const content = (
          <>
            <span className={s.marker} aria-hidden="true">
              {st.status === 'done' ? <Check size={20} strokeWidth={3} /> : i + 1}
            </span>
            {st.shortLabel && st.shortLabel !== st.label ? (
              <span className={s.label}>
                <span aria-hidden="true">{st.shortLabel}</span>
                <span className="visually-hidden">{st.label}</span>
              </span>
            ) : (
              <span className={s.label}>{st.label}</span>
            )}
            {st.sublabel && <span className={cx(s.sublabel, 'num')}>{st.sublabel}</span>}
            <span className="visually-hidden">
              {`, krok ${i + 1} z ${steps.length}, ${STATUS_TEXT[st.status]}`}
            </span>
          </>
        )
        // the vertical stepper shows the whole name and date, no tooltip needed
        const title = vertical ? undefined : st.sublabel ? `${st.label}: ${st.sublabel}` : st.label
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
            {vertical && st.body && <div className={s.body}>{st.body}</div>}
          </li>
        )
      })}
    </ol>
  )
  // The vertical stepper holds actions (buttons, a form), not navigation: a plain labelled list.
  if (vertical) return <div className={cx(s.root, s.vertical)}>{list}</div>
  return (
    <nav className={cx(s.root, steps.length <= 4 ? s.few : s.many)} aria-label={label}>
      {list}
      {activeIndex >= 0 && (
        <p className={s.caption} aria-hidden="true">
          Krok {activeIndex + 1} z {steps.length}: <strong>{steps[activeIndex].label}</strong>
        </p>
      )}
    </nav>
  )
}
