"""Leakage-safe tuned default Logistic Regression training."""
from pathlib import Path
import json, joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"dataset/transactions.csv"; MODEL=ROOT/"models/fraud_model.pkl"; RESULTS=ROOT/"results"; SEED=42
df=pd.read_csv(DATA).drop_duplicates().dropna(); X=df.drop(columns="is_fraud"); y=df.is_fraud.astype(int)
Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.2,random_state=SEED,stratify=y)
cv=StratifiedKFold(5,shuffle=True,random_state=SEED)
pipe=make_pipeline(StandardScaler(),LogisticRegression(solver="liblinear",max_iter=3000,random_state=SEED))
search=GridSearchCV(pipe,{"logisticregression__C":[.003,.01,.03,.1,.3,1,3,10],"logisticregression__penalty":["l1","l2"],"logisticregression__class_weight":[None,"balanced"]},scoring="f1",cv=cv,n_jobs=-1,refit=True).fit(Xtr,ytr)
oof=cross_val_predict(search.best_estimator_,Xtr,ytr,cv=cv,method="predict_proba",n_jobs=-1)[:,1]
grid=np.arange(.2,.801,.005); threshold=float(grid[np.argmax([f1_score(ytr,oof>=t,zero_division=0) for t in grid])])
model=search.best_estimator_; prob=model.predict_proba(Xte)[:,1]; pred=(prob>=threshold).astype(int)
tn,fp,fn,tp=confusion_matrix(yte,pred,labels=[0,1]).ravel()
out={"model":"Tuned Logistic Regression","threshold":threshold,"accuracy":float(accuracy_score(yte,pred)),"precision":float(precision_score(yte,pred,zero_division=0)),"recall":float(recall_score(yte,pred,zero_division=0)),"f1":float(f1_score(yte,pred,zero_division=0)),"roc_auc":float(roc_auc_score(yte,prob)),"average_precision":float(average_precision_score(yte,prob)),"confusion":{"tn":int(tn),"fp":int(fp),"fn":int(fn),"tp":int(tp)},"best_params":search.best_params_,"cv_f1":float(search.best_score_),"train_rows":len(Xtr),"test_rows":len(Xte),"seed":SEED}
MODEL.parent.mkdir(exist_ok=True); RESULTS.mkdir(exist_ok=True); joblib.dump(model,MODEL,compress=3); (RESULTS/"baseline_metrics.json").write_text(json.dumps(out,indent=2)); print(json.dumps(out,indent=2))
