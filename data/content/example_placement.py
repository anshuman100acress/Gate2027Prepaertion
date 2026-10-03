"""Editorial placement: each index is the explanatory section an example follows."""
from core import subjects
placements={
'0-propositions':(0,2),'0-quantifiers':(1,2),'0-sets-functions':(1,2),'0-orders-lattices':(2,1),'0-algebraic-structures':(2,2),'0-graphs-matching':(2,1),'0-counting':(0,1),'0-recurrences':(0,1),'0-matrices-rank':(2,0),'0-eigen-lu':(0,2),'0-limits-continuity':(0,2),'0-extrema-mvt':(1,2),'0-integration':(0,1),'0-conditional-bayes':(1,2),'0-random-statistics':(1,2),'0-binomial-poisson':(0,1),'0-continuous-distributions':(0,2),
'1-boolean':(2,1),'1-kmap-tabular':(0,2),'1-combinational':(0,1),'1-sequential':(2,0),'1-representation':(0,1),
'2-instructions':(1,2),'2-alu-control':(0,2),'2-cache':(1,2),'2-memory-io':(0,2),'2-pipeline':(0,2),
'3-c-memory':(1,0),'3-recursion':(0,2),'3-linear-structures':(1,2),'3-trees-bst':(1,1),'3-heaps-graphs':(1,2),
'4-analysis':(1,1),'4-search-sort':(0,1),'4-hashing':(1,2),'4-greedy-divide':(1,2),'4-dynamic':(0,1),'4-graph-algorithms':(2,2),'4-bfs-dfs':(0,2),'4-minimum-spanning':(1,0),'4-shortest-paths':(0,1),
'5-automata':(0,2),'5-regular-pumping':(2,0),'5-cfg-pda':(0,2),'5-cfl-pumping':(1,0),'5-decidability':(0,2),
'6-lexical':(0,1),'6-parsing':(0,1),'6-translation-runtime':(1,2),'6-ir-dataflow':(0,2),
'7-processes':(0,1),'7-synchronization':(0,1),'7-deadlock':(1,0),'7-scheduling':(0,2),'7-virtual-files':(0,1),'7-files':(1,0),
'8-er-relations':(0,1),'8-queries':(1,2),'8-normalization':(2,0),'8-storage-index':(1,2),'8-transactions':(1,1),
'9-layers-switching':(2,2),'9-link-layer':(0,0),'9-routing':(0,1),'9-ipv4':(0,1),'9-fragmentation':(1,2),'9-tcp-web':(0,0),'9-sockets':(2,1),'9-dns':(1,1),'9-http':(0,1),'10-quantitative':(1,2),'10-verbal-reasoning':(1,0)}
lessons=[l for s in subjects for l in s['lessons']]
assert set(placements)=={l['id'] for l in lessons}
for l in lessons:
 positions=placements[l['id']]
 assert len(positions)==len(l['examples'])
 for e,index in zip(l['examples'],positions):
  assert 0<=index<len(l['sections'])
  e['afterSection']=index
