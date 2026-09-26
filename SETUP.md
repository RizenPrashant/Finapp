# Setup

## Local config

Two backend config files hold credentials and are **not** tracked in git:

```
backend/src/main/resources/application-dev.properties
backend/src/main/resources/application-prod.properties
```

Copy the templates and fill them in:

```bash
cd backend/src/main/resources
cp application-dev.properties.example  application-dev.properties
cp application-prod.properties.example application-prod.properties
```

Every `CHANGE_ME` needs a real value. Generate a JWT secret with:

```bash
openssl rand -base64 32
```

The secret has no fallback in code — if `jwt.secret` is unset the application
refuses to start. That is deliberate: the previous default was a literal in
`JwtConfig.java`, so a missing secret meant tokens were signed with a key
anyone could read out of the repository.

Either file's `jwt.secret` can be overridden at runtime with the `JWT_SECRET`
environment variable, so rotation does not require editing files.

## Credentials currently exposed

These were committed before the config files were untracked, so they remain in
git history and **removing them from the working tree does not revoke them**:

- the Gmail App Password in `application-dev.properties`
- the JWT signing secret that was in `application.properties`

Both need rotating at the source:

1. Revoke the Gmail App Password at https://myaccount.google.com/apppasswords
   and issue a new one.
2. Generate a new JWT secret. Changing it invalidates every existing token, so
   all sessions will be signed out once.

To scrub them from history as well, rewrite it with
[git-filter-repo](https://github.com/newren/git-filter-repo) or the BFG, then
force-push. Rotate first either way — history rewriting cannot un-leak a value
that has already been pushed.

## Running

```bash
# Backend — dev profile is the default (port 2002, finappdb)
cd backend && mvn spring-boot:run

# Backend — prod profile (port 2003, finappdb_prod)
mvn spring-boot:run -Dspring-boot.run.arguments=--spring.profiles.active=prod

# Frontend
cd frontend
npm run dev    # port 5173, talks to backend 2002
npm run prod   # port 5175, talks to backend 2003
```

Under the dev profile the app seeds sample data and a login of
`test@finapp.com` / `test1234`. Neither the sample data nor that account is
created under any other profile.
