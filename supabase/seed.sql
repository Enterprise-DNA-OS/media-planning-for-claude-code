insert into campaigns(id,name,client,currency,budget_cents,owner,starts_on,ends_on) values
 ('10000000-0000-0000-0000-000000000001','Harbour Spring','Harbour Homewares','NZD',1800000,'Mara',current_date-20,current_date+30),
 ('10000000-0000-0000-0000-000000000002','Coastal Launch','Coastal Outdoors','AUD',1200000,'Theo',current_date-10,current_date+40) on conflict do nothing;
insert into placements(id,campaign_id,name,vendor,channel,starts_on,ends_on,planned_cents,approved_by,approved_at,approval_evidence) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Morning audio','Harbour Radio','Audio',current_date-10,current_date+9,600000,'Luc',now(),'DEMO client approval 01'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Weekend display','City Publisher','Display',current_date+2,current_date+15,450000,null,null,null),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Search launch','Coastal Search','Search',current_date-5,current_date+14,900000,null,null,null) on conflict do nothing;
insert into delivery(id,placement_id,day,spend_cents,impressions,clicks,evidence) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date-1,370000,180000,0,'DEMO supplier statement'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003',current_date-4,170000,24000,700,'DEMO daily performance') on conflict do nothing;
insert into invoices(id,placement_id,reference,amount_cents,due_on) values
 ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','DEMO-RADIO-01',400000,current_date-2) on conflict do nothing;
insert into claims(id,placement_id,name,evidence,reviewer,reviewed_on,review_due) values
 ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Delivery within two days','DEMO dispatch study','Luc',current_date-15,current_date+20),
 ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Lowest local price',null,null,null,null),
 ('50000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','Recycled material claim','DEMO supplier specification','Luc',current_date-30,current_date-1) on conflict do nothing;
insert into tasks(id,campaign_id,name,owner,due_on) values
 ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Resolve radio invoice variance','Mara',current_date-3),
 ('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Refresh performance extract','Theo',current_date-2) on conflict do nothing;
