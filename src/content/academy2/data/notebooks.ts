export const capstoneQuery = `WITH calendar(month) AS (VALUES (5),(6),(7),(8),(9)),
  monthly AS (
    SELECT m.month, COUNT(d.ozone) AS valid_rows, AVG(d.ozone) AS mean_ozone
    FROM calendar m LEFT JOIN dataset d ON m.month=d.month
    GROUP BY m.month
  )
SELECT month, valid_rows, mean_ozone,
       SUM(valid_rows) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS running_count
FROM monthly ORDER BY month`;

export const sqlExamples: Record<string, string> = {
  sql: "SELECT species, COUNT(*) AS observations, AVG(petal_length) AS mean_length\nFROM dataset GROUP BY species ORDER BY species",
  join: `WITH varieties(species, location) AS (
  VALUES ('setosa','North'),('versicolor','South'),('virginica','East')
)
SELECT v.location, SUM(CASE WHEN d.species IS NOT NULL THEN 1 ELSE 0 END) AS specimens
FROM varieties v LEFT JOIN dataset d ON d.species=v.species
GROUP BY v.location ORDER BY v.location`,
  window: `SELECT species, petal_length,
       DENSE_RANK() OVER (PARTITION BY species ORDER BY petal_length DESC) AS rank_in_class
FROM dataset ORDER BY species, rank_in_class LIMIT 12`,
  cte: `WITH by_species AS (
  SELECT species, AVG(petal_length) AS mean_length FROM dataset GROUP BY species
)
SELECT species, ROUND(mean_length, 2) AS mean_cm
FROM by_species WHERE mean_length > 2 ORDER BY mean_cm`,
  normalize: `CREATE TABLE species_detail (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
INSERT INTO species_detail (name) SELECT DISTINCT species FROM dataset ORDER BY species;
CREATE TABLE sample (id INTEGER PRIMARY KEY, type_id INTEGER REFERENCES species_detail(id), length REAL);
INSERT INTO sample (type_id,length) SELECT s.id,d.petal_length FROM dataset d JOIN species_detail s ON d.species=s.name;
SELECT s.name, COUNT(*) FROM sample a JOIN species_detail s ON a.type_id=s.id GROUP BY s.name`,
  index: `CREATE INDEX specimen_kind ON dataset(species);
EXPLAIN QUERY PLAN SELECT * FROM dataset WHERE species='setosa'`,
  transaction: `CREATE TABLE ledger(id INTEGER PRIMARY KEY,cents INTEGER CHECK(cents >= 0));
INSERT INTO ledger VALUES(1,1000),(2,250);
BEGIN;
UPDATE ledger SET cents=cents-100 WHERE id=1;
UPDATE ledger SET cents=cents+100 WHERE id=2;
ROLLBACK;
SELECT * FROM ledger ORDER BY id`,
  nosql: `WITH orders(id, document) AS (VALUES
  (1,'{"items":[{"sku":"A","quantity":2},{"sku":"B","quantity":1}]}'),
  (2,'{"items":[{"sku":"A","quantity":3}]}'),
  (3,'{"items":[]}')
)
SELECT json_extract(i.value,'$.sku') AS sku,
       SUM(json_extract(i.value,'$.quantity')) AS quantity
FROM orders AS d JOIN json_each(d.document, '$.items') AS i
GROUP BY sku ORDER BY sku`,
  dashboard: capstoneQuery,
};

const ndarray = "x=np.array([row[2] for row in rows],dtype=float)";
export const pythonExamples: Record<string, string> = {
  jupyter:
    "from statistics import mean\npetals = [row[2] for row in rows]\nprint(len(petals), round(mean(petals),3))",
  numpy: `import numpy as np
${ndarray}
z=(x-x.mean())/x.std(ddof=1)
print(round(float(x.mean()),3))
print(round(float(z.mean()),3), round(float(z.std(ddof=1)),3))`,
  pandas: `import pandas as pd
frame=pd.DataFrame(rows,columns=columns)
print(frame.groupby('species')['petal_length'].agg(['count','mean']).round(3))`,
  polars: `import polars as pl
import pandas as pd
from time import perf_counter
from statistics import median
material = rows * 30  # 压力测试试件，从实测行复制；不作为更多独立样本
pandas_frame = pd.DataFrame(material, columns=columns)
polars_frame = pl.DataFrame(material, schema=columns, orient='row')
def pandas_query():
    return pandas_frame.loc[pandas_frame['species']=='setosa','petal_length'].mean()
def polars_query():
    return polars_frame.lazy().filter(pl.col('species')=='setosa').select(pl.col('petal_length').mean()).collect().item()
for label, query in [('Pandas', pandas_query), ('Polars',polars_query)]:
    answer = query()
    times = []
    for _ in range(7):
        t = perf_counter()
        assert abs(query()-answer)<1e-9
        times.append((perf_counter()-t)*1000)
    print(label, round(answer,3), round(median(times),3), 'ms')
assert abs(float(pandas_query())-float(polars_query()))<1e-9`,
  matplotlib: `import matplotlib
matplotlib.use('svg')
import matplotlib.pyplot as plt
${ndarray.replace("x=np.array", "import numpy as np\nx=np.array")}
fig,ax=plt.subplots()
_,edges,_=ax.hist(x,bins=8)
ax.set_xlabel('petal_length (cm)')
print(edges.round(2).tolist())
plt.close(fig)`,
  seaborn: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
frame=pd.DataFrame(rows,columns=columns)
ax=sns.boxplot(data=frame,x='species',y='petal_length')
print([tick.get_text() for tick in ax.get_xticklabels()])
plt.close(ax.figure)`,
};
