<DESCRIPTION>
I want to reinforce the codebase with rules, hooks, skills, prompts and subagents. They MUST be implemented @.codex dir
Utilise nested dir support if needed
</DESCRIPTION>

<REFERENCES>
@agents_docs.md
@hooks_docs.md
@rules_docs.md
@skills_docs.md
@subAgents_docs.md
@openAPI_prompt.md
</REFERENCES>

<UPDATES>
- update @AGENTS.md with https://context7.com/websites/agents_md/llms.txt?tokens=10000
- utilise https://context7.com/websites/agentskills_io/llms.txt?tokens=17363 for skill generation and update $write-a-skill in the /Users/daniu/.agents.
- update @UBIQUITOUS_LANGUAGE.md with $UBIQUITOUS-LANGUAGE
- I want a comprehensive ERD of my data model
- I want a mermaid diagram of my API workflows
</UPDATES>

<RULES>
- Create a rule that will utilize context7 whenever there is documentation query.
- Create a rule that will enforce strict typechecks at all times
- Create a rule to always implement validation with zod across frontend and backend
- Create a rule where all requests should be process via API routes EXCEPT for form submissions, they should be processed via server actions
- Create a rule where frontend code generated MUST have a suspense and UI to visualise the pending response/promise
- Create a rule where backend code generated MUST have a 'success' and 'error' handling
- Create a rule where documentation is updated after every implementation if required
- Create a rule when UI is being developed to utilize Shadcn.
</RULES>

<HOOKS>
- After every plan implementation or updates, always have a post implementation hook that will run all tests to verify that the feature that has been changed is working and not broke any other feature.
</HOOKS>

<SUBAGENTS>
- This agent should create, read, update, delete and append documentation for me after every implementation
- Test automation expert. Use proactively to run tests and fix failures.
</SUBAGENTS>
