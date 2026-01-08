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
| _#0_  | 12      | -      | 56h 30m    | 52h 30m      |
| PT15  | 9       | 5      | 16h        | 17h          |
| PT27  | 8       | 3      | 9h 30m     | 9h 30m       |
| PT28  | 8       | 8      | 14h        | 14h          |
| PT30  | 8       | 8      | 14h        | 14h          |

> place technical tasks corresponding to story `#0` and leave out story points (not applicable in this case)

- Hours per task average, standard deviation (estimate and actual)

|            | Mean   | StDev  |
| ---------- | ------ | ------ |
| Estimation | 141.95 | 138.20 |
| Actual     | 137.56 | 132.01 |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1

  $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1 = -0.031 = -3.1\% $$

- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

  $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| = 0.05 = 5.0\%$$

## QUALITY MEASURES

- Unit Testing:
  - Total hours estimated: 7h 30m
  - Total hours spent: 7h 30m
  - Nr of automated unit test cases: 396
  - Coverage (if available): 87%
- Integration testing:
  - Total hours estimated: 2h 45m
  - Total hours spent: 2h 45m
- E2E testing (both frontend and backend):
  - Total hours estimated: 6h 45m
  - Total hours spent: 6h 45m
- Code review:
  - Total hours estimated: 3h 30m
  - Total hours spent: 3h 30m
- Technical Debt management:
  - Strategy adopted: [TD_strategy](..\TD_strategy.md)
  - Total hours estimated estimated at sprint planning: 10h
  - Total hours spent: 10h

## ASSESSMENT

- What caused your errors in estimation (if any)?

  - We did not have too much errors regarding estimation other than fix bugs that was overestimated, because we based on the estimation of the previous sprint

- What lessons did you learn (both positive and negative) in this sprint?

  - We learned how to better manage time and collaboration during holiday periods, when team availability is reduced. We improved our use of asynchronous communication to keep work moving forward without requiring everyone to be online at the same time.
    However, we also identified that insufficient planning for vacations can slow down decisions and feedback.
    Overall, the sprint highlighted the importance of clear planning, documentation, and task ownership to make asynchronous teamwork effective.

- Which improvement goals set in the previous retrospective were you able to achieve?

  - We were able to achieve the improvement goals set in the previous retrospective. In particular, we created a more detailed and structured workflow document, which helped clarify processes, responsibilities, and transitions between stages of work. Additionally, we improved our planning by better estimating hours per story point, leading to more realistic sprint commitments and improved alignment between planned and actual effort.

- Which ones you were not able to achieve? Why?

  - None

- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

  - improve team efficiency and deliver more user stories. We aim to achieve this by improving task prioritization, reducing blockers, and strengthening team coordination

- One thing you are proud of as a Team!!

  - We finished all the stories for this sprint, without any arguing. We communicate efficiently.
