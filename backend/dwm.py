"""Lightweight DWM warehouse, OLAP, classification and clustering."""
from pathlib import Path
import sqlite3
import pandas as pd
from sklearn.cluster import AgglomerativeClustering,KMeans
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score,precision_score,recall_score,f1_score
MTF=Path(__file__).resolve().parents[1]/"UPI_Fraud_Detector"/"MTF"; CSV=MTF/"dataset/transactions.csv"; DB=MTF/"results/transactions_warehouse.sqlite"
F=["amount","transactions_last_hour","account_age_days","new_device","location_changed","failed_attempts","time_since_last_transaction"]
def load(): return pd.read_csv(CSV).drop_duplicates().dropna()
def warehouse():
 d=load(); DB.parent.mkdir(parents=True,exist_ok=True)
 with sqlite3.connect(DB) as c:
  fact=d[F+["is_fraud"]].copy(); fact.insert(0,"transaction_key",range(1,len(fact)+1)); fact.to_sql("fact_transaction",c,if_exists="replace",index=False)
  for table,col in {"dim_device":"new_device","dim_location":"location_changed","dim_account_age":"account_age_days"}.items():
   dim=d[[col]].drop_duplicates().sort_values(col).reset_index(drop=True); dim.insert(0,"dimension_key",range(1,len(dim)+1)); dim.to_sql(table,c,if_exists="replace",index=False)
 return {"fact_rows":len(d),"dimensions":["dim_device","dim_location","dim_account_age"],"database":str(DB)}
def olap(device=None,location=None,fraud=None):
 d=load()
 if device is not None:d=d[d.new_device==device]
 if location is not None:d=d[d.location_changed==location]
 if fraud is not None:d=d[d.is_fraud==fraud]
 g=d.groupby(["new_device","location_changed"],observed=True).agg(transactions=("is_fraud","size"),fraud_rate=("is_fraud","mean"),average_amount=("amount","mean")).reset_index()
 return {"rollup":g.to_dict("records"),"drilldown":d.head(100).to_dict("records"),"slice_dice_count":len(d)}
def mining():
 d=load(); x,y=d[F],d.is_fraud; xt,xv,yt,yv=train_test_split(x,y,test_size=.2,random_state=42,stratify=y); scaler=StandardScaler().fit(xt); a,b=scaler.transform(xt),scaler.transform(xv); out={}
 for name,m in {"Decision Tree":DecisionTreeClassifier(max_depth=6,class_weight="balanced",random_state=42),"Naive Bayes":GaussianNB()}.items():
  m.fit(a if name=="Naive Bayes" else xt,yt); p=m.predict(b if name=="Naive Bayes" else xv)
  out[name]={k:float(fn(yv,p)) for k,fn in {"accuracy":accuracy_score,"precision":precision_score,"recall":recall_score,"f1":f1_score}.items()}
 z=scaler.fit_transform(x.sample(min(1500,len(x)),random_state=42)); km=KMeans(n_clusters=3,random_state=42,n_init=10).fit(z); hc=AgglomerativeClustering(n_clusters=3).fit(z[:500]); sizes=lambda v:pd.Series(v).value_counts().sort_index().tolist()
 return {"classification":out,"kmeans":{"clusters":3,"sizes":sizes(km.labels_)},"hierarchical":{"sample_size":len(hc.labels_),"clusters":3,"sizes":sizes(hc.labels_)}}
