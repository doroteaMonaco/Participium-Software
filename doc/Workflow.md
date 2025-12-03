### STORY 24/25
1. REPORT
 - Citizen submits report (PENDING_APPROVAL)
 - Municipal public relation officer approves or reject report (ASSIGNED/REJECTED)
 - Technical officer can decide to send to external maintainers (still in ASSIGNED status)
 - he (tech officer or external maintainer) must change status to IN_PROGRESS
    - when he finishes the work move to RESOLVED (cannot be modified anymore)

N.B. Tech officer can see reports he assigned to external maintainer but can't modify them
    Add external maintainer roles table with relation to report table

### STORY 26
- continue from story 25  
- once assigned to external maintainer a report can be commented both from tech officer and external maint.  (R/W for both)
    - should be implement with a side comment section in the report view
    - when the report is in RESOLVED status cannot be commented anymore.



