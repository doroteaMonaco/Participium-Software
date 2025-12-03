TEMPLATE FOR RETROSPECTIVE (Team 14)
=====================================

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES 

### Macro statistics

- Number of stories committed vs. done: 7 committed and 5 completed 
- Total points committed vs. done: 20 story points committed and 12 story points completed 
- Nr of hours planned vs. spent (as a team): 102h 10m planned and 99h 55m spent

**Remember**a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD if required (you cannot remove items!) 

### Detailed statistics

| Story  | # Tasks | Points | Hours est. | Hours actual |
|--------|---------|--------|------------|--------------|
| _Uncategorized_   |    9     |       |      47h      |      45h 35m        |
| PT01      |    9     |    1    |      9h 30m      |     11h 50m         |
| PT02      |    6     |    1    |      5h 20m       |      6h 30m        |  
| PT03      |    4     |    2    |      3h 30m      |      4h 30m        |  
| PT04      |    8     |    5    |      10h 30m      |     12h 30m         |  
| PT05      |    7     |    3    |      9h 30m      |     14h 30m         |
| PT06 (committed)     |    8     |    3    |      9h 10m      |      5h 30m        | 
| PT07 (committed)     |    6     |    5    |      7h 40m      |      0        |  

Task estimated: 57
Task done: 46

> story `Uncategorized` is for technical tasks, leave out story points (not applicable in this case)

- Hours per task average, standard deviation (estimate and actual)

|            | Mean | StDev |
|------------|------|-------|
| Estimation |  1h 47m    |   3h 16m    | 
| Actual     |  2h 10m    |   3h 21m    |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1

    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1 = -0.022 = -2.2\% $$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| = 0.201 = 20.1\%$$
  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated: 9h
  - Total hours spent: 12h
  - Nr of automated unit test cases: 153 
  - Coverage: 100%(Stmts), 91.36%(Branch), 100%(Funcs), 100%(lines)
- E2E testing:
  - Total hours estimated: 7h 50m
  - Total hours spent: 9h
  - Nr of test cases: 56
- Code review 
  - Total hours estimated: 3h 35m 
  - Total hours spent: 3h 40m 
  


## ASSESSMENT

- What did go wrong in the sprint?
  - The underestimating the time of the tasks
  - # story done vs estimated
- What caused your errors in estimation (if any)?
  - Thinking of the stories were as easy as what we estimated but it wasn't
- What lessons did you learn (both positive and negative) in this sprint?
  - Talking more with each other
  - Have more scrum meeting
  - Pay attention to each other

- Which improvement goals set in the previous retrospective were you able to achieve? 
  - No previous retrospective
- Which ones you were not able to achieve? Why?
  - No previous retrospective
- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

  > Propose one or two
    Improve team work and increase scrum meetings

- One thing you are proud of as a Team!!
  - We are transparent in acknowledging when we are wrong and how to improve