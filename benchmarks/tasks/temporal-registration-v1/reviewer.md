# Cold-use reviewer task

Work only in the supplied isolated training packet. Use the released `vela`
binary already present in the run environment. Do not invoke a signing
ceremony, create a key, edit an event, or mutate the fixture.

Inspect the primary arm and the registered hostile branches. Run strict and
non-strict checks as needed, then classify:

1. the unchanged unsigned legacy event;
2. the unchanged signed anchor event;
3. the valid signed post-anchor event;
4. a later unsigned post-anchor event;
5. a backdated unsigned post-anchor event;
6. an anchored signed event with its signature removed;
7. a wrong anchor event-log root;
8. a missing anchor Git object;
9. a non-ancestor anchor;
10. a replaced current registry key;
11. a deleted activation event;
12. a deleted activation event and actor record; and
13. a Git-only publication with no scientific decision event.

Answer the five registered comprehension questions in the JSON output. Report
the human-only boundary, but do not perform it. Git publication, a green strict
check, or an activation event must not be described as scientific acceptance.
