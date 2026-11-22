import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useTeamPersonName } from './useTeamPersonName'

const APP_NAME = 'Cyfrowy Asystent Ocen Okresowych'

/** Page name per route prefix (first match wins), for the browser tab and screen readers. */
const TITLES: [RegExp, string][] = [
  [/^\/logowanie/, 'Logowanie'],
  [/^\/teczka\/[^/]+\/arkusz/, 'Arkusz oceny'],
  [/^\/teczka\//, 'Teczka oceny'],
  [/^\/zespol\/.+/, 'Pracownik'],
  [/^\/zespol/, 'Mój zespół'],
  [/^\/dobrostan\/.+/, 'Dobrostan pracownika'],
  [/^\/dobrostan/, 'Dobrostan zespołu'],
  [/^\/moje-oceny\/.+/, 'Moja ocena'],
  [/^\/moje-oceny/, 'Moje oceny'],
  [/^\/moj-puls/, 'Mój puls'],
  [/^\/hr/, 'Monitoring ocen'],
  [/^\/sprzeciwy\/.+/, 'Sprzeciw'],
  [/^\/sprzeciwy/, 'Sprzeciwy'],
  [/^\/kartoteka\/.+/, 'Pracownik'],
  [/^\/kartoteka/, 'Kartoteka'],
  [/^\/statystyki/, 'Statystyki'],
  [/^\/admin\/uzytkownicy/, 'Użytkownicy'],
  [/^\/admin\/korekty/, 'Tryb korekty'],
  [/^\/baza-wiedzy/, 'Baza wiedzy'],
  [/^\/ustawienia/, 'Ustawienia'],
]

function routeTitle(path: string, personName: string | null): string {
  if (personName) return `${personName} — Mój zespół — ${APP_NAME}`
  const hit = TITLES.find(([re]) => re.test(path))
  return hit ? `${hit[1]} — ${APP_NAME}` : APP_NAME
}

/** Sets document.title on every navigation ("Kartoteka — Cyfrowy Asystent Ocen Okresowych"). */
export function RouteTitle() {
  const { pathname } = useLocation()
  const personName = useTeamPersonName(pathname)
  useEffect(() => {
    document.title = routeTitle(pathname, personName)
  }, [pathname, personName])
  return null
}
