## Technical Debt Strategy

### Prioritization Principles
1. **Category First**
	- Handle issues by categories in the following sequence:
	  1. Security
	  2. Reliability
	  3. Maintainability
2. **Severity First**
	- For issue of the same category, handle issues in descending severity (Critical → High → Medium → Low).
	- Within each severity level, unblock items that affect multiple services before localized ones.
3. **Type order**
	- When the previous rules still leave a tie, prefer the following order:
      1. Bugs
      2. Vulnerability
      3. Code smell

### Execution Workflow
1. **Triage**
	- Review new SonarQube findings, bug reports, and incident retros at the start of every sprint and before every demo presentation.
2. **Planning**
	- During each sprint planning, reserve capacity for the top pending technical debt items following the prioritization stack.
3. **Remediation**
	- Implement fixes with regression tests; for security issues, add monitoring or alert rules when relevant.
4. **Verification**
	- Re-run the full automated suite for every fix.
	- Document residual risks when a full mitigation is not feasible and schedule follow-up work.

### Sprint 3 issues to handle
For this sprint we will handle all reliability issues and maintainability issues of severity "high" and "medium"


