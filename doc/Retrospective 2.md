TEMPLATE FOR RETROSPECTIVE (Team 14)
=====================================

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES 

### Macro statistics

- Number of stories committed vs. done: 5 committed and 4 completed 
- Total points committed vs. done: 28 story points committed and 15 story points completed 
- Nr of hours planned vs. spent (as a team): 96h 30m planned and 96h 5m

**Remember**a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD if required (you cannot remove items!) 

### Detailed statistics

| Story  | # Tasks | Points | Hours est. | Hours actual |
|--------|---------|--------|------------|--------------|
| _Uncategorized_   |    11     |       |      35h      |      37h 15m        |
| PT06      |    7     |    3    |      8h 30m      |     9h 10m         |
| PT07      |    8     |    5    |      11h 30m       |      11h 40m        |  
| PT08      |    8     |    2    |      10h 50m      |      13h 50m        |  
| PT09      |    9     |    5    |      12h      |     12h 30m         |  
| PT011 (committed)     |    11     |    13    |      18h 40m      |     11h 40m         |


Task estimated: 54
Task done: 47

> story `Uncategorized` is for technical tasks, leave out story points (not applicable in this case)

- Hours per task average, standard deviation (estimate and actual)

|            | Mean | StDev |
|------------|------|-------|
| Estimation |  107.2    |   119.7    | 
| Actual     |  105.09    |   128.78    |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1

    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1 = 0.004 = 0.4\% $$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| = 0.186 = 18.6\%$$
  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated: 10h 30m
  - Total hours spent: 8h
  - Nr of automated unit test cases: 224 
  - Coverage: 76.07%(Stmts), 70.94%(Branch), 80.58%(Funcs), 75.6%(lines)
- E2E testing (considering both frontend and backend):
  - Total hours estimated: 15h
  - Total hours spent: 12h
  - Nr of test cases: 88
- Code review 
  - Total hours estimated: 5h
  - Total hours spent: 5h 10m 
  


## ASSESSMENT

- What did go wrong in the sprint?
  - We started working late, loosing almost a week.
  - High coupling between tasks of different individuals, some people had to wait for their teammates to finish the tasks.

- What caused your errors in estimation (if any)?
  - We underestimate bugs and errors to fix, that they made us delay the work, but we were close to the initial estimation.

- What lessons did you learn (both positive and negative) in this sprint?
  - We should organize our work better so we can work in parallel on multiple stories and actually get them all done, for example doing a document at the start of the sprint that explain well all the workflow and the business logic to implement.
  - We should focus more on quality rather than quantity. This would be helpful for the later sprint, in order to have less technical debt.

- Which improvement goals set in the previous retrospective were you able to achieve? 
  - We did more scrum meeting and communicate better within each other.

- Which ones you were not able to achieve? Why?
  - We did a good improvement in terms of team work, but we were late again for the demo presentation because the vision of business logic and technical details to implement were different between the teammates.

- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)
  - Prioritize some tasks to avoid waiting queue. 
  - Works consistently.
  - Doing a document to have a clear vision of the things to implement and the business logic.

- One thing you are proud of as a Team!!
  - There is a very good environment.
  - We face difficulties with a good communication, without arguing.
