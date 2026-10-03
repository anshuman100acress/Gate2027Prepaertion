import json
qs=[]
def add(s,t,p,a,ex,opts=None):
 qs.append(dict(id=len(qs),subject=s,type=t,prompt=p,answer=a,explanation=ex,options=opts or [],marks=1 if len(qs)%2==0 else 2))
for n in range(3,13):
 add(0,'NAT',f'How many distinct unordered pairs can be selected from {n} elements?',n*(n-1)//2,'Use n choose 2 = n(n−1)/2. Order does not matter.')
 add(1,'NAT',f'What is the maximum signed integer representable using {n}-bit two’s complement?',2**(n-1)-1,'The signed range is −2^(n−1) to 2^(n−1)−1.')
 add(2,'NAT',f'A {n}-stage pipeline executes 20 instructions without stalls. How many cycles are required?',n+19,'Ideal pipeline cycles = stages + instructions − 1.')
 add(3,'NAT',f'A complete binary tree has {2**n-1} nodes. Its root is at level 0. What is its height in edges?',n-1,'A perfect binary tree with height h has 2^(h+1)−1 nodes.')
 add(4,'NAT',f'A connected undirected graph has {n+8} vertices. How many edges does any spanning tree contain?',n+7,'Every spanning tree on V vertices has V−1 edges.')
 add(5,'NAT',f'A nondeterministic finite automaton has {n} states. What is the maximum number of subsets considered in subset construction?',2**n,'Each DFA state corresponds to a subset of the NFA states; there are 2^n subsets.')
 add(6,'NAT',f'A basic block computes t = {n}; u = t + {n+2}. After constant propagation and folding, what constant is assigned to u?',2*n+2,'Replace t by its known constant, then evaluate the addition.')
 add(7,'NAT',f'Two processes arrive at time 0 with CPU bursts {n} and {n+4} ms. FCFS runs the shorter first. What is mean waiting time in ms?',n/2,'The first waits zero, the second waits for the first burst. Mean = (0+n)/2.')
 add(8,'NAT',f'The relation R(A,B,C) has dependencies A→B and B→C. How many attributes are in the closure of {{A}}?',3,'Start with A, add B using A→B, then C using B→C.')
 add(9,'NAT',f'An IPv4 subnet uses prefix /{32-n}. How many total addresses does the subnet contain?',2**n,'There are 32−prefix host bits. Total addresses = 2^(host bits); this includes reserved addresses.')
 add(10,'NAT',f'A product costs ₹{n*100}. Its price increases by 10%. What is the new price in rupees?',n*110,'Multiply the original price by 1.10.')
curated=[
(0,'MCQ','Which condition makes a square matrix invertible?',0,'A square matrix is invertible exactly when its determinant is nonzero.',['det(A) ≠ 0','trace(A) = 0','All entries are positive','A has two equal rows']),
(0,'MSQ','Which statements always hold?',[0,2],'Differentiability implies continuity. Bayes follows from conditional probability. Continuity alone does not imply differentiability.',['Differentiability implies continuity','Continuity implies differentiability','P(A|B)P(B) = P(B|A)P(A), when defined','Disjoint nonzero-probability events are independent']),
(1,'MCQ','Which expression equals A + AB?',1,'Absorption: A + AB = A(1+B) = A.',['B','A','AB','A+B']),
(1,'MSQ','Which circuits can store state?',[1,2],'Flip-flops and counters are sequential circuits; ordinary adders and multiplexers are combinational.',['Full adder','D flip-flop','Binary counter','Multiplexer']),
(2,'MCQ','A cache hit takes 1 ns, miss rate is 5%, and miss penalty is 40 ns. What is AMAT?',2,'AMAT = 1 + 0.05×40 = 3 ns.',['1 ns','2 ns','3 ns','41 ns']),
(2,'MSQ','Which are recognized pipeline hazard classes?',[0,1,3],'Structural, data and control are the standard pipeline hazard classes.',['Structural','Data','Lexical','Control']),
(3,'MCQ','What order does a stack use?',0,'A stack removes the most recently pushed item first.',['Last in, first out','First in, first out','Sorted order','Random order']),
(3,'MSQ','Which statements about structures are correct?',[0,2],'Array indexing is constant-time. Bottom-up heap construction is linear. An unbalanced BST can take linear time.',['Array indexing takes O(1)','Every BST search takes O(log n)','Bottom-up binary heap construction takes O(n)','A heap array is always fully sorted']),
(4,'MCQ','Which algorithm handles negative edge weights and can detect reachable negative cycles?',1,'Bellman–Ford relaxes edges repeatedly and checks for further relaxation.',['Dijkstra','Bellman–Ford','Prim','Binary search']),
(4,'MSQ','Which comparison sorts have O(n log n) worst-case time?',[0,2],'Merge sort and heapsort have O(n log n) worst-case time. Standard quicksort and insertion sort can take O(n²).',['Merge sort','Standard quicksort','Heapsort','Insertion sort']),
(5,'MCQ','Which language is not regular?',2,'A finite automaton cannot remember an unbounded count to match zeros with ones.',['Strings ending in 01','All binary strings','{0ⁿ1ⁿ : n ≥ 0}','Strings with an even number of ones']),
(5,'MSQ','Regular languages are closed under which operations?',[0,1,2,3],'All four operations preserve regularity.',['Union','Intersection','Complement','Concatenation']),
(6,'MCQ','Which analysis normally flows backward?',2,'Liveness propagates information from successors toward predecessors.',['Reaching definitions','Constant propagation','Liveness','Available expressions']),
(6,'MSQ','Which claims about compilers are correct?',[0,2],'Lexers produce tokens; parsing constructs grammatical structure; activation records preserve call state.',['Lexical analysis produces tokens','A lexer ordinarily proves type correctness','Recursive calls need distinct activation records','LL parsing ordinarily handles left recursion without changes']),
(7,'MCQ','Which replacement policy can exhibit Belady’s anomaly?',0,'FIFO may have more faults when given additional frames. Stack algorithms such as LRU do not.',['FIFO','LRU','Optimal','All policies']),
(7,'MSQ','Which are necessary Coffman conditions for deadlock?',[0,1,2,3],'All four are necessary conditions in the standard resource deadlock model.',['Mutual exclusion','Hold and wait','No preemption','Circular wait']),
(8,'MCQ','A schedule is conflict serializable exactly when its precedence graph is:',1,'An acyclic graph has a topological ordering corresponding to a serial transaction order.',['Complete','Acyclic','Strongly connected','Undirected']),
(8,'MSQ','Which statements about SQL are correct?',[0,2],'WHERE filters rows before groups are formed. HAVING filters groups. Basic SELECT may retain duplicates.',['WHERE filters rows before grouping','SELECT always eliminates duplicates','HAVING can filter groups','COUNT(*) excludes every row containing NULL']),
(9,'MCQ','TCP receiver window is 16 KiB and congestion window is 8 KiB. What is their sending-window limit?',1,'The limit is the minimum of receiver window and congestion window, before subtracting outstanding data.',['16 KiB','8 KiB','24 KiB','32 KiB']),
(9,'MSQ','Which IPv4 statements are correct?',[0,2],'IPv4 addresses are 32 bits, fragment offset units are 8 bytes, and a /24 contains 256 total addresses.',['IPv4 addresses have 32 bits','Fragment offsets are measured in single bytes','A /24 contains 256 total addresses','NAT guarantees end-to-end application compatibility']),
(10,'MCQ','A value rises by 20% and then falls by 20%. What is the net change?',2,'1.2 × 0.8 = 0.96, so the final value is 4% lower.',['No change','4% increase','4% decrease','20% decrease']),
(10,'MSQ','Which numerical statements are correct?',[0,2],'A square has four equal sides. A prime greater than 2 is odd. Division by zero is undefined.',['A square has four equal sides','Every odd integer is prime','Every prime greater than 2 is odd','Division by zero equals zero'])]
for q in curated:add(*q)
open('/workspace/Gate2027Prepaertion/data/questions.json','w').write(json.dumps(qs,ensure_ascii=False))
