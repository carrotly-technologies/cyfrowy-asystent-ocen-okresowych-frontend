import type { EmployeeFields } from '../../api/employees'

/** Starting values of the "new employee" form. */
export const EMPTY_EMPLOYEE: EmployeeFields = {
  firstName: '',
  lastName: '',
  unit: '',
  position: '',
  employment: 'PRACOWNIK',
  officeHead: false,
  managesPeople: false,
  appointedYear: null,
  grade: null,
  gradeGrantedOn: null,
  indefiniteSince: null,
  evaluatorId: null,
}
