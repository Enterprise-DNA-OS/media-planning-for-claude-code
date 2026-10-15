create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table campaigns (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), client text not null,
 currency text not null check(currency in ('NZD','AUD','USD','GBP','EUR')), budget_cents bigint not null check(budget_cents between 0 and 9000000000000),
 owner text not null, starts_on date not null, ends_on date not null check(ends_on>=starts_on),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table placements (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references campaigns(id), name text not null,
 vendor text not null, channel text not null, starts_on date not null, ends_on date not null check(ends_on>=starts_on),
 planned_cents bigint not null check(planned_cents between 0 and 9000000000000),
 approved_by text, approved_at timestamptz, approval_evidence text,
 source_line text, source_placement text, source_row jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(campaign_id,source_line)
);
create table delivery (
 id uuid primary key default gen_random_uuid(), placement_id uuid not null references placements(id), day date not null,
 spend_cents bigint not null check(spend_cents between 0 and 9000000000000), impressions bigint not null check(impressions>=0), clicks bigint not null check(clicks>=0 and clicks<=impressions),
 evidence text not null check(length(trim(evidence))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(placement_id,day)
);
create table invoices (
 id uuid primary key default gen_random_uuid(), placement_id uuid not null references placements(id), reference text not null,
 amount_cents bigint not null check(amount_cents between 0 and 9000000000000), due_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(placement_id,reference)
);
create table claims (
 id uuid primary key default gen_random_uuid(), placement_id uuid not null references placements(id), name text not null,
 evidence text, reviewer text, reviewed_on date, review_due date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(review_due is null or review_due>=reviewed_on)
);
create table tasks (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references campaigns(id), name text not null, owner text not null,
 due_on date not null, done_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table events (
 id uuid primary key default gen_random_uuid(), actor text not null, action text not null, record_id uuid,
 before_record jsonb, after_record jsonb, created_at timestamptz not null default now()
);
create function immutable_event() returns trigger language plpgsql as $$ begin raise exception 'Events cannot be changed'; end $$;
create trigger protect_event before update or delete on events for each row execute function immutable_event();
do $$ declare t text; begin
 foreach t in array array['campaigns','placements','delivery','invoices','claims','tasks'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
end $$;
alter table events enable row level security;
revoke all on events from public;
create view media_plan as
 select p.id,p.campaign_id,c.name campaign,c.client,c.currency,c.owner,p.name placement,p.vendor,p.channel,p.starts_on,p.ends_on,p.planned_cents,
 p.approved_by,p.approval_evidence,p.source_line,p.source_placement from placements p join campaigns c on c.id=p.campaign_id;
create view pacing as
 select p.*,coalesce(d.spend_cents,0) spent_cents,d.last_day,coalesce(d.impressions,0) impressions,coalesce(d.clicks,0) clicks,
 round(p.planned_cents::numeric * greatest(0,least(current_date-p.starts_on+1,p.ends_on-p.starts_on+1))/(p.ends_on-p.starts_on+1)) expected_cents,
 coalesce(d.spend_cents,0)-round(p.planned_cents::numeric * greatest(0,least(current_date-p.starts_on+1,p.ends_on-p.starts_on+1))/(p.ends_on-p.starts_on+1)) variance_cents,
 case when d.last_day is null then 'No actuals' when d.last_day < least(current_date-1,p.ends_on) then 'Stale actuals' else 'Current' end freshness
 from media_plan p left join (select placement_id,sum(spend_cents) spend_cents,max(day) last_day,sum(impressions) impressions,sum(clicks) clicks from delivery group by placement_id) d on d.placement_id=p.id;
create view reconciliation as
 select p.id,p.campaign_id,p.campaign,p.placement,p.vendor,p.currency,p.planned_cents,p.spent_cents,
 coalesce(i.invoiced_cents,0) invoiced_cents,coalesce(i.invoiced_cents,0)-p.spent_cents invoice_variance_cents,i.invoice_count
 from pacing p left join (select placement_id,sum(amount_cents) invoiced_cents,count(*) invoice_count from invoices group by placement_id) i on i.placement_id=p.id;
create view compliance_issues as
 select p.id,p.campaign_id,p.campaign,p.placement,'PLAN_APPROVAL' rule,'No recorded approval' issue from media_plan p where p.approved_by is null
 union all select p.id,p.campaign_id,p.campaign,p.placement,'CLAIM_REGISTER','No claim review recorded' from media_plan p where not exists(select 1 from claims c where c.placement_id=p.id)
 union all select p.id,p.campaign_id,p.campaign,p.placement,'CLAIM_EVIDENCE',c.name||': evidence missing or review expired' from media_plan p join claims c on c.placement_id=p.id where nullif(trim(c.evidence),'') is null or c.reviewer is null or c.reviewed_on is null or c.review_due is null or c.review_due<current_date
 union all select p.id,p.campaign_id,p.campaign,p.placement,'FLIGHT_DATES','Flight outside campaign dates' from media_plan p join campaigns c on c.id=p.campaign_id where p.starts_on<c.starts_on or p.ends_on>c.ends_on
 union all select c.id,c.id,c.name,'Campaign total','BUDGET','Planned cost exceeds campaign budget' from campaigns c join placements p on p.campaign_id=c.id group by c.id having sum(p.planned_cents)>c.budget_cents;
create view launch_check as select p.id,p.campaign_id,p.campaign,p.placement,p.vendor,p.starts_on,p.approved_by,
 (select count(*) from compliance_issues i where i.id=p.id or (i.campaign_id=p.campaign_id and i.rule='BUDGET')) blocking_checks
 from media_plan p where p.ends_on>=current_date;
create view overdue_tasks as select t.id,t.campaign_id,c.name campaign,t.name task,t.owner,t.due_on,current_date-t.due_on days_late from tasks t join campaigns c on c.id=t.campaign_id where t.done_at is null and t.due_on<current_date;
create view allocations as select campaign_id,campaign,currency,channel,count(*) flights,sum(planned_cents) planned_cents,sum(spent_cents) spent_cents from pacing group by campaign_id,campaign,currency,channel;
