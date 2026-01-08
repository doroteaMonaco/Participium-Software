# RETROSPECTIVE 4(Team 14)

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES

### Macro statistics

- Number of stories committed vs done : 4 story committed vs 4 story done
- Total points committed vs done : 19 story points committed vs 19 story points done
- Nr of hours planned vs spent (as a team) : 95h 40m planned vs 95h 30m done

**Remember** a story is done ONLY if it fits the Definition of Done:

- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD

### Detailed statistics

| Story | # Tasks | Points | Hours est. | Hours actual |
| ----- | ------- | ------ | ---------- | ------------ |
| _#0_  | 12      | -      |   47h  |   45h 50m    |
| PT15  |  8      |   3    |   9h 10m      |    9h 10m       |
| PT27  |  10      |   5    |   13h 30m   |   13h 30m     |
| PT28  |   7     |   3    |     9h    |      9h 30m     |
| PT30  |   9     |   8    |     17h    |     17h 30m      |


> place technical tasks corresponding to story `#0` and leave out story points (not applicable in this case)

- Hours per task average, standard deviation (estimate and actual)

|            | Mean   | StDev  |
| ---------- | ------ | ------ |
| Estimation |  |  |
| Actual     |  |  |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1

  $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1 = \% $$

- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

  $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| = \%$$

## QUALITY MEASURES

- Unit Testing:
  - Total hours estimated: 7h 45m
  - Total hours spent: 7h 45m
  - Nr of automated unit test cases: 667
  - Coverage (if available): 96.05% (Stmts), 84.7% (Branch), 98.25% (Funcs), 97.09% (Lines)
- Integration testing:
  - Total hours estimated: 6h 15m
  - Total hours spent: 6h 15m
- E2E testing (both frontend and backend):
  - Total hours estimated: 10h
  - Total hours spent: 10h 30m
- Code review:
  - Total hours estimated: 4h 10m
  - Total hours spent: 4h 10m
- Technical Debt management:
  - Strategy adopted: [TD_strategy](..\TD_strategy.md)
  - Total hours estimated estimated at sprint planning: 8h
  - Total hours spent: 8h

## ASSESSMENT

- What caused your errors in estimation (if any)?


- What lessons did you learn (both positive and negative) in this sprint?


- Which improvement goals set in the previous retrospective were you able to achieve?


- Which ones you were not able to achieve? Why?


- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)


- One thing you are proud of as a Team!!
