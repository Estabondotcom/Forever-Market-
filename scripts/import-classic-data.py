import re,json,collections,urllib.request,concurrent.futures,sys
# Original importer. Usage: python scripts/import-classic-data.py path/to/decompressed.sql
# See docs/DATA-SOURCES.md before importing or redistributing.
s=open(sys.argv[1],encoding='utf-8').read()
def rows(t):
 body=re.search(r'INSERT INTO `'+t+r'` VALUES (.*?);\n',s,re.S)[1]
 return [list(map(float,m[:7])) for m in re.findall(r'\((-?\d+),(-?[\d.]+),(-?[\d.]+),(-?\d+),(-?\d+),(-?\d+),(-?\d+),',body)]
refs=collections.defaultdict(list);loot=collections.defaultdict(list)
for r in rows('reference_loot_template'):refs[int(r[0])].append(r[1:])
for r in rows('fishing_loot_template'):loot[int(r[0])].append(r[1:])
def expand(rs,mult=1):
 out=collections.defaultdict(float); groups=collections.defaultdict(list)
 for item,p,g,lo,hi,cond in rs:
  if p<0 or cond:continue
  if lo<0:
   if -lo==13755:continue
   for k,v in expand(refs[int(-lo)],mult*p/100).items():out[k]+=v
  elif g:groups[g].append((item,p,lo,hi))
  else:out[int(item)]+=mult*p/100*(lo+hi)/2
 for group in groups.values():
  remainder=(100-sum(r[1] for r in group))/max(1,sum(r[1]==0 for r in group))
  for item,p,lo,hi in group:out[int(item)]+=mult*(p or remainder)/100*(lo+hi)/2
 return out
# Explicit geographic records; no AidVir dataset or implementation is reused.
spec=[('durotar-coast','Durotar','Coastal water',14,-70),('barrens-coast','The Barrens','Coast (Ratchet)',17,-20),('stranglethorn-inland','Stranglethorn Vale','Inland water',33,130),('feralas-inland','Feralas','Main inland table',357,205),('tanaris-coast','Tanaris','Coastal water',440,205),('azshara-inland','Azshara','General zone water; excludes Bay of Storms',16,205),('felwood','Felwood','Inland water',361,205),('hinterlands','The Hinterlands','General zone water',47,205),('eastern-plaguelands','Eastern Plaguelands','Inland water',139,330),('winterspring','Winterspring','Inland water',618,330)]
# Add independently identified subareas with an explicit table and base in SQL.
bases=dict((int(a),int(b)) for a,b in re.findall(r'\((-?\d+),(-?\d+)\)',re.search(r'INSERT INTO `skill_fishing_base_level` VALUES (.*?);',s,re.S)[1]))
for area,zone,name in [(1222,'Feralas','Western coast'),(1237,'Azshara','Bay of Storms'),(718,'The Barrens','Wailing Caverns waters')]:
 if area in loot and area in bases:spec.append((str(area),zone,name,area,bases[area]))
locations=[];ids={6358,6359,21153,6522,13422,13759,13755,13756,13889,13760,13909}
for key,zone,area,aid,base in spec:
 out=expand(loot[aid]); catches=[{'itemId':k,'probability':round(v,8),'basis':'expected units per successful catch'} for k,v in out.items() if v>0]
 seasonal=sum(r[1]/100 for r in loot[aid] if r[3]==-13755)
 if seasonal:
  catches.extend([{'itemId':13755,'probability':seasonal,'months':[10,11,12,1,2,3],'basis':'Classic seasonal bonus roll'},{'itemId':13756,'probability':seasonal,'months':[4,5,6,7,8,9],'basis':'Classic seasonal bonus roll'}])
 ids.update(c['itemId'] for c in catches)
 locations.append({'id':key,'zone':zone,'area':area,'mode':'open-water','minimumSkill':max(1,base),'baseThreshold':base,'reliableSkill':base+95,'catches':catches,'confidence':'estimated','distributionComplete':True,'source':'https://github.com/cmangos/classic-db/blob/master/Full_DB/ClassicDB_1_12_1_z2815.sql.gz','notes':['Classic 1.12 table; not measured in Forever. Includes secondary items and independent bonus rolls.','Nightfin, Sunscale and eel time-of-day variations are not validated; this is an average table.','No Fishing Rack or Fishing Hut bonuses.']})
# No probabilities invented for schools or new Forever species.
locations.extend([{'id':'sagefish-school','zone':'Alterac Mountains','area':'Greater Sagefish schools','mode':'school','minimumSkill':None,'baseThreshold':None,'reliableSkill':None,'catches':[{'itemId':21153,'probability':None}],'confidence':'incomplete','distributionComplete':False,'source':'https://www.wowhead.com/forever/item=21153/raw-greater-sagefish','notes':['Pool catch distribution, success, availability and travel time are unverified.']},{'id':'deviate-oasis','zone':'The Barrens','area':'Oasis waters (Deviate Fish)','mode':'open-water','minimumSkill':None,'baseThreshold':None,'reliableSkill':None,'catches':[{'itemId':6522,'probability':None}],'confidence':'incomplete','distributionComplete':False,'source':'https://www.wowhead.com/forever/item=6522/deviate-fish','notes':['Location candidate; catch rate and full distribution need Forever verification.']}])
def metadata(i):
 try:
  data=json.load(urllib.request.urlopen(f'https://api.ahledger.com/v1/items/{i}?game=forever'))
  return {'id':i,'name':data['name'],'vendorCopper':data.get('vendorSell'),'metadataVerified':True,'source':data.get('url',f'https://ahledger.com/items/{i}')}
 except Exception as e:return {'id':i,'name':f'Item {i}','vendorCopper':None,'metadataVerified':False,'source':f'https://ahledger.com/items/{i}'}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:fish=list(ex.map(metadata,sorted(ids)))
json.dump(locations,open('src/data/locations.json','w'),indent=2);json.dump(fish,open('src/data/fish.json','w'),indent=2)
print(len(locations),'locations',len(fish),'items',sum(f['metadataVerified'] for f in fish),'metadata verified')
