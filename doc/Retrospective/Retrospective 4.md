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

  - We made a mistake while planning the stories: initially, we assumed we would complete story 11 and planned it together with two other stories. Later, we realized we had to respect the priorities among the stories, so we removed story 11 from the plan. As a result, we had many extra hours for two stories but too few hours compared to the story points of the third story we needed to add. This led to a third story with too few hours compared to its story points, thus compromising its quality.

- What lessons did you learn (both positive and negative) in this sprint?

  - We learned to give absolute importance to the business value of the stories, even if it meant deprioritizing stories that were already in progress.
  - We learned to allocate a consistent amount of time to the tasks.

- Which improvement goals set in the previous retrospective were you able to achieve?

  - We achieved all the goals we had previously set.
    - In particular, thanks to the workflow document, we were able to break tasks down more effectively and work in parallel, because we had a clearer understanding of how the earlier part would be developed—so we could already work on the next part.
    - This improved the consistency of our work and helped us avoid bottlenecks.

- Which ones you were not able to achieve? Why?

  - we achieved all goals set, but we always have margin to improve,
    for example being more specific on the workflow document

- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

  - Doing a better workflow document (more detailed)
  - Improve planning related to hours per story points

- One thing you are proud of as a Team!!
  - We finished all the stories, without rushing the last day.
