"""Reviewed derivations. Equations are LaTeX, explanations remain plain text."""
from core import subjects
lessons={l['id']:l for s in subjects for l in s['lessons']}
def W(id,index,given,goal,strategy,steps,answer,verification):
 e=lessons[id]['examples'][index]
 e.update(given=given,goal=goal,strategy=strategy,steps=[{'title':t,'explanation':why,'equation':eq} for t,eq,why in steps],answer=answer,verification=verification)
W('0-propositions',0,'P and Q can independently be true or false.','Decide whether an implication is equivalent to its converse.','Disprove equivalence by finding one truth assignment where the two expressions disagree.',[
 ('Choose a distinguishing assignment',r'P=F,\quad Q=T','Choose the antecedent of the first implication false and its consequent true. This is deliberately asymmetric; P=Q would not expose the difference.'),
 ('Evaluate the original implication',r'P\to Q\equiv\neg P\lor Q=T\lor T=T','Material implication excludes only a true antecedent with a false consequent. A false antecedent therefore makes this implication true.'),
 ('Evaluate the converse',r'Q\to P\equiv\neg Q\lor P=F\lor F=F','Reversing the implication changes which statement is the antecedent. Here the converse asserts that a true Q forces a false P.'),
 ('Draw the logical conclusion',r'(P\to Q)\not\equiv(Q\to P)','Equivalence requires agreement on every assignment. One disagreement is enough to refute it; no full truth table is necessary.')],
 'The implication and its converse are not equivalent.','The contrapositive ¬Q→¬P is true on this assignment, consistent with its equivalence to P→Q.')
W('0-quantifiers',0,'Domain: students s and exams e. Passed(s,e) states that student s passed exam e.','Negate “every student passed at least one exam.”','Formalize the original scope, then move negation across one quantifier at a time.',[
 ('Translate the original statement',r'\forall s\ \exists e\ Passed(s,e)','The exam can depend on the student. The sentence does not require one common exam passed by everyone.'),
 ('Negate the universal quantifier',r'\neg(\forall s\exists e\ Passed(s,e))\equiv\exists s\neg(\exists e\ Passed(s,e))','A universal statement fails if there is at least one counterexample student.'),
 ('Negate the existential quantifier',r'\exists s\ \forall e\ \neg Passed(s,e)','For that student there must be no witness exam at all. Hence every exam fails the Passed predicate.')],
 'There is a student who passed no exam.','“A student failed one exam” is too weak: that student could still have passed another exam, leaving the original statement true.')
W('0-sets-functions',1,'Three distinct inputs and two distinct outputs. All functions are permitted.','Count total, surjective and injective functions.','Count all functions, subtract those missing an output, then use the pigeonhole principle.',[
 ('Count independent assignments',r'2\cdot2\cdot2=2^3=8','A function chooses exactly one output for each input; inputs may share outputs, so multiply two choices three times.'),
 ('Describe failure of surjectivity',r'N_{not\ onto}=2','With only two outputs, missing an output means all inputs select the other one. These are the two constant functions; there is no third failure case.'),
 ('Subtract and check injectivity',r'N_{onto}=8-2=6,\qquad N_{injective}=0','Three inputs cannot have pairwise distinct images inside two outputs. Onto and one-to-one are different conditions.')],
 '8 total functions; 6 surjections; 0 injections.','Onto assignments split the inputs 1+2 or 2+1 across the outputs: choosing the isolated input and its output gives 3×2=6.')
W('0-orders-lattices',0,'The set is all positive divisors of 12; the order relation is divisibility.','Find the meet and join of 4 and 6.','Use the relation’s bound definition, not ordinary numerical minimum and maximum.',[
 ('Find lower bounds',r'D(12)=\{1,2,3,4,6,12\},\qquad LB(4,6)=\{1,2\}','A lower bound must divide both numbers and belong to the poset. Among these, 1 divides 2, so 2 is the greatest lower bound.'),
 ('Find upper bounds',r'UB(4,6)=\{12\}','An upper bound must be divisible by both 4 and 6. Within this set 12 is the only candidate, and therefore the least upper bound.'),
 ('Express the operations',r'4\wedge6=\gcd(4,6)=2,\qquad4\vee6=\operatorname{lcm}(4,6)=12','The gcd/lcm shortcut is justified here because the poset of all divisors of 12 contains these bounds.')],
 'Meet 2; join 12.','4 is not a lower bound of 6, and 6 is not an upper bound of 4: neither number divides the other.')
W('0-algebraic-structures',0,'Nonzero residues {1,2,3,4} with multiplication modulo 5.','Check every group axiom.','Verify closure and identity, construct inverses, and use inherited associativity.',[
 ('Check closure and associativity',r'a,b\not\equiv0\pmod5\Rightarrow ab\not\equiv0\pmod5','A prime has no zero divisors among its nonzero residues. Modular multiplication inherits integer multiplication’s associativity.'),
 ('Identify the identity',r'1a\equiv a1\equiv a\pmod5','The operation is multiplication, so the neutral element is 1. Using the additive identity 0 would also leave the given set.'),
 ('Exhibit every inverse',r'1\cdot1\equiv2\cdot3\equiv3\cdot2\equiv4\cdot4\equiv1\pmod5','This covers all four elements. A group requires an inverse for every element, not just a successful example.'),
 ('Check commutativity',r'ab\equiv ba\pmod5','The group axioms now hold, and commutativity adds the description abelian.')],
 'An abelian group.','Replacing modulus 5 by 6 breaks this argument: 2×3 is 0 modulo 6, so the nonzero residues are not even closed.')
W('0-graphs-matching',0,'The simple undirected cycle C₅ has five vertices.','Find edge count, maximum matching size and chromatic number.','Separate the three invariants and prove matching/coloring bounds are attained.',[
 ('Use the handshake identity',r'\sum_v\deg(v)=5\cdot2=10=2|E|\Rightarrow |E|=5','Each edge contributes to the degree of two endpoints, so divide the degree sum by two.'),
 ('Bound and construct a matching',r'\nu(C_5)\le\lfloor5/2\rfloor=2','Disjoint matching edges consume two vertices each. Edges (1,2) and (3,4) attain the bound, proving maximum size 2.'),
 ('Rule out two colors',r'\chi(C_5)>2','Alternating two colors around the cycle makes vertices 5 and 1 share a color despite being adjacent.'),
 ('Construct a three-coloring',r'(c_1,c_2,c_3,c_4,c_5)=(A,B,A,B,C)','This assignment satisfies every edge, giving an upper bound 3. Combined with the lower bound, it establishes equality.')],
 '5 edges, maximum matching 2, chromatic number 3.','An even cycle would permit two colors and a perfect matching; the odd vertex count matters for both results.')
W('0-counting',0,'Eight distinct people; committee has three members with no roles or repetition.','Count unordered committees.','Count ordered choices, then divide by the number of orders per committee.',[
 ('Count ordered triples',r'8\cdot7\cdot6=336','Choices shrink because a person cannot be selected twice. This count treats different selection orders as different.'),
 ('Measure overcounting',r'3!=6','Every particular set of three people occurs in all six orders. The overcount factor is uniform, which makes division valid.'),
 ('Count the committees',r'\binom83=\frac{8!}{3!5!}=\frac{336}{6}=56','There are no chair/secretary roles. If roles were specified, permutations rather than combinations would be required.')],
 '56 committees.','Choosing the five excluded people also gives C(8,5)=56, an independent symmetry check.')
W('0-recurrences',0,'a₀=0 and aₙ=2aₙ₋₁+1 for n≥1.','Obtain and verify a closed form.','Unroll until the base term; identify the geometric series and verify by substitution.',[
 ('Expand two levels',r'a_n=2(2a_{n-2}+1)+1=2^2a_{n-2}+2+1','Each substitution doubles the earlier term and all constants already introduced.'),
 ('State the k-level pattern',r'a_n=2^ka_{n-k}+\sum_{i=0}^{k-1}2^i','The powers of two record how many later doublings each +1 experiences. This pattern can be proved by induction on k.'),
 ('Reach the base and sum',r'a_n=2^na_0+\frac{2^n-1}{2-1}=2^n-1','Set k=n so the recurrence reaches the given initial value. The denominator comes from the finite geometric-series identity.'),
 ('Verify the recurrence',r'2(2^{n-1}-1)+1=2^n-1','The candidate satisfies the recurrence and gives a₀=0, so it is the sequence determined by the recurrence and initial condition.')],
 r'\(a_n=2^n-1\).','n=1 and n=2 give 1 and 3; these agree with direct recurrence evaluation.')
W('0-matrices-rank',0,'x+y=3 and 2x+2y=6.','Classify and parameterize all solutions.','Row-reduce the augmented matrix and compare coefficient/augmented ranks.',[
 ('Write the augmented system',r'[A\mid b]=\begin{bmatrix}1&1&3\\2&2&6\end{bmatrix}','The right-hand side must participate in every row operation. Reducing A alone cannot detect inconsistency.'),
 ('Eliminate the dependent equation',r'R_2\leftarrow R_2-2R_1:\quad\begin{bmatrix}1&1&3\\0&0&0\end{bmatrix}','The last row says 0=0 and supplies no new constraint. Had its last entry been nonzero, there would be no solution.'),
 ('Apply the rank criterion',r'\operatorname{rank}(A)=\operatorname{rank}([A\mid b])=1<2','Equal ranks mean consistency; rank below the number of unknowns leaves one free variable.'),
 ('Parameterize the free variable',r'y=t,\quad x=3-t,\qquad t\in\mathbb R','Choosing y freely and solving the surviving equation produces every solution, rather than just one example.')],
 r'Infinitely many solutions: \((x,y)=(3-t,t)\).','Substitution gives x+y=3 and 2x+2y=6 for every real t.')
W('0-eigen-lu',0,'A=[[2,1],[0,3]]. Eigenvectors must be nonzero.','Find eigenvalues and their eigendirections.','Solve the characteristic equation, then solve a separate homogeneous system for each root.',[
 ('Form the characteristic determinant',r'\det(A-\lambda I)=\det\begin{bmatrix}2-\lambda&1\\0&3-\lambda\end{bmatrix}=(2-\lambda)(3-\lambda)','The matrix is triangular, so the determinant is the product of diagonal entries; roots are 2 and 3.'),
 ('Solve for eigenvalue 2',r'(A-2I)v=0\Rightarrow v_2=0\Rightarrow v=t\begin{bmatrix}1\\0\end{bmatrix},\ t\ne0','The free first coordinate supplies nonzero vectors. The zero vector solves the equations but is excluded by the eigenvector definition.'),
 ('Solve for eigenvalue 3',r'(A-3I)v=0\Rightarrow-v_1+v_2=0\Rightarrow v=t\begin{bmatrix}1\\1\end{bmatrix},\ t\ne0','This eigendirection differs from the first, so the two directions are independent.')],
 'Eigenvalues 2 and 3; eigendirections (1,0) and (1,1).','A(1,0)ᵀ=(2,0)ᵀ and A(1,1)ᵀ=(3,3)ᵀ. Trace=5 and determinant=6 equal the eigenvalue sum and product.')
W('0-limits-continuity',0,'The rational expression (x²−4)/(x−2), with x approaching 2.','Evaluate the limit and distinguish it from the function value.','Simplify on a punctured neighborhood; a limit concerns nearby values, not the value at the point.',[
 ('Recognize the indeterminate form',r'\frac{2^2-4}{2-2}=\frac00','0/0 is not a numerical answer. It signals that substitution alone cannot evaluate the limit.'),
 ('Factor and cancel away from 2',r'\frac{x^2-4}{x-2}=\frac{(x-2)(x+2)}{x-2}=x+2\quad(x\ne2)','Cancellation is legal only where the denominator is nonzero. That is sufficient for computing a limit.'),
 ('Take the simplified limit',r'\lim_{x\to2}\frac{x^2-4}{x-2}=\lim_{x\to2}(x+2)=4','The nearby values agree with a continuous polynomial, whose limit is its substituted value.')],
 'The limit is 4; the original expression is undefined at x=2.','Defining f(2)=4 would fill the removable discontinuity. Defining another value would preserve the limit but fail continuity.')
W('0-extrema-mvt',0,'f(x)=x²−4x+1 on the closed interval [0,5].','Find the absolute minimum and maximum.','Generate critical points, include endpoints, then compare values.',[
 ('Find interior critical points',r'f^{\prime}(x)=2x-4=0\Rightarrow x=2','The derivative exists everywhere. Only x=2 is an interior stationary candidate.'),
 ('Evaluate all candidates',r'f(0)=1,\qquad f(2)=-3,\qquad f(5)=6','Continuity on a closed bounded interval guarantees absolute extrema. They can occur at endpoints even when derivatives there do not vanish.'),
 ('Compare values',r'\min_{[0,5]}f=-3,\qquad\max_{[0,5]}f=6','The minimum occurs at x=2 and the maximum at x=5. A derivative test alone would miss this maximum.')],
 'Minimum −3 at 2; maximum 6 at 5.','Completing the square gives f(x)=(x−2)²−3, confirming the minimum and the increase to the right endpoint.')
W('0-integration',1,'Integral from 0 to 1 of 2x·exp(x²).','Evaluate exactly by substitution.','Match the derivative of the inner expression and change bounds with the variable.',[
 ('Choose a complete substitution',r'u=x^2,\qquad du=2x\,dx','The factor 2x dx appears exactly, so the entire integrand becomes eᵘ du without leftover x terms.'),
 ('Transform the endpoints',r'x=0\Rightarrow u=0,\qquad x=1\Rightarrow u=1','The new bounds happen to have the same numeric values, but they now refer to u; always calculate them explicitly.'),
 ('Integrate in the new variable',r'\int_0^1 2xe^{x^2}\,dx=\int_0^1e^u\,du=[e^u]_0^1=e-1','Evaluate upper minus lower. Keeping old x-bounds on a general u-integral would mix variables.')],
 r'\(e-1\).','Differentiating e^(x²) returns 2x·e^(x²), independently verifying the antiderivative.')
W('0-conditional-bayes',0,'Prevalence 0.01; sensitivity 0.90; false-positive rate 0.10.','Find the probability of the condition given a positive test.','Account for both sources of positive tests, then restrict to the positive population.',[
 ('Label events and joint probabilities',r'P(D\cap +)=0.01(0.90)=0.009','D means having the condition. Sensitivity is P(+|D), not the posterior probability being asked for.'),
 ('Count positives without the condition',r'P(\overline D\cap +)=0.99(0.10)=0.099','The large noncondition population can contribute more positives despite its smaller per-person positive rate.'),
 ('Normalize within all positives',r'P(D\mid +)=\frac{0.009}{0.009+0.099}=\frac1{12}\approx0.08333','The denominator is total positive probability. Omitting false positives or the prevalence changes the event being computed.')],
 'Approximately 8.33%.','Among 10,000 people: 90 true positives and 990 false positives; 90/1080 reproduces the posterior.')
W('0-random-statistics',0,'X takes 0 and 2, each with probability 1/2.','Find mean, variance and standard deviation.','Compute first and second moments separately, then subtract the squared first moment.',[
 ('Compute the mean',r'E[X]=0\cdot\tfrac12+2\cdot\tfrac12=1','Expectation is the probability-weighted value, which need not itself be a possible outcome.'),
 ('Compute the second moment',r'E[X^2]=0^2\cdot\tfrac12+2^2\cdot\tfrac12=2','Square each outcome before averaging. Squaring the mean would instead give 1 and is not the second moment.'),
 ('Compute spread',r'\operatorname{Var}(X)=E[X^2]-(E[X])^2=2-1=1,\qquad\sigma=\sqrt1=1','Variance is in squared units; standard deviation is the nonnegative square root in the original units.')],
 'Mean 1, variance 1, standard deviation 1.','The deviations from mean are −1 and +1, so their squared values are both 1; their weighted average confirms variance 1.')
W('0-binomial-poisson',0,'Four independent fair coin tosses; exactly two heads required.','Find the probability.','Count valid head positions and multiply by the probability of each disjoint ordering.',[
 ('Identify the model',r'X\sim\operatorname{Binomial}(4,1/2)','There are a fixed number of independent trials, each with the same head probability. These assumptions justify the binomial model.'),
 ('Count successful sequences',r'\binom42=\frac{4!}{2!2!}=6','Choose the two head positions; order of choosing these positions does not matter.'),
 ('Weight each sequence',r'P(X=2)=\binom42(1/2)^2(1/2)^2=\frac6{16}=\frac38','Each length-four sequence has probability 1/16. The six sequences are disjoint, so add their probabilities.')],
 r'\(3/8=0.375\).','The five binomial counts are 1,4,6,4,1; summing gives 16 equally likely outcomes.')
W('0-continuous-distributions',1,'X~Normal(10,4), using the convention Normal(mean,variance).','Standardize x=14 and express its cumulative probability.','Read the parameter convention before converting to a standard normal variable.',[
 ('Extract standard deviation',r'\mu=10,\quad\sigma^2=4\Rightarrow\sigma=2','The second parameter is variance, so taking the square root is necessary. A paper using Normal(mean,standard deviation) must explicitly be treated differently.'),
 ('Standardize the boundary',r'Z=\frac{X-\mu}{\sigma},\qquad z=\frac{14-10}{2}=2','Subtract the center and divide by the scale. Dividing by variance would give the wrong number of standard deviations.'),
 ('Translate the event',r'P(X\le14)=P(Z\le2)=\Phi(2)','The scale is positive, so the inequality direction stays the same. Φ denotes the standard-normal CDF; use a supplied table when a numeric approximation is requested.')],
 r'\(z=2\), and cumulative probability \(\Phi(2)\).','14 is four units above the mean, which is exactly two standard deviations of two units each.')
W('2-cache',0,'32-bit byte addresses; 16 KiB data capacity; 4-way associativity; 64-byte blocks.','Find tag, index and offset bits.','Determine sets from data capacity first, then take powers-of-two logarithms.',[
 ('Convert capacity and count lines',r'C=16\cdot1024=16384\ B,\quad L=C/64=256','KiB is binary here. Data capacity excludes tag/valid metadata; do not subtract those bytes from C.'),
 ('Count sets',r'S=L/4=64','Each set holds four lines. Index selects a set; associativity is not another independent address field.'),
 ('Find low-order fields',r'b=\log_2 64=6,\quad s=\log_2 64=6','Byte offset selects one of 64 bytes inside a block. Set index selects one of 64 sets.'),
 ('Allocate remaining address bits',r't=32-s-b=32-6-6=20','Tag is what remains after identifying a byte and a set. The tag comparison distinguishes different memory blocks mapping to that set.')],
 '20 tag bits, 6 index bits, 6 offset bits.','Reconstruct data capacity: 2⁶ sets ×4 ways ×2⁶ bytes=16,384 bytes; the fields sum to 32 bits.')
W('2-pipeline',0,'Five stages; 12 instructions; three actual stall cycles; cycle time 2 ns.','Find elapsed time including fill and drain.','Count pipeline cycles before multiplying by the cycle duration.',[
 ('Count the ideal cycles',r'C_{ideal}=k+n-1=5+12-1=16','The first instruction needs five cycles. Each remaining instruction adds one cycle in this single-issue, balanced-stage model.'),
 ('Include stalls',r'C_{actual}=16+3=19','The question supplies total actual stalls, so add them once. They are not three stalls per instruction.'),
 ('Convert cycles to time',r'T=19\cdot2\ ns=38\ ns','Pipeline overlap changes instruction throughput; multiplying every instruction by all five stage times would erase that overlap.')],
 '19 cycles, 38 ns.','With one instruction and no stalls the same formula gives five cycles, matching its complete path through the stages.')
W('4-analysis',0,'For each i=1,…,n, the inner loop performs i constant-time operations.','Find the total operation count and tight asymptotic growth.','Sum the changing inner bound; nesting alone does not specify the exact count.',[
 ('Express the work as a sum',r'T(n)=\sum_{i=1}^n\sum_{j=1}^{i}1=\sum_{i=1}^ni','The inner loop length depends on i, so n×n is an upper bound but not the exact count.'),
 ('Evaluate the arithmetic series',r'T(n)=\frac{n(n+1)}2','Pairing first and last terms gives average (n+1)/2 across n terms.'),
 ('Establish a tight bound',r'\frac12n^2\le T(n)\le n^2\quad(n\ge1)\Rightarrow T(n)=\Theta(n^2)','Both upper and lower bounds are quadratic. Θ, rather than only O, expresses this tight order.')],
 r'\(n(n+1)/2\) body operations; \(\Theta(n^2)\).','For n=3, counts 1+2+3=6 agree with 3×4/2. Loop-control overhead has the same asymptotic order.')
W('5-regular-pumping',0,'Language L={0ⁿ1ⁿ:n≥0}.','Prove L is not regular.','Assume regularity and defeat every permitted split of a carefully chosen word.',[
 ('Accept the adversary’s pumping length',r'w=0^p1^p\in L,\quad |w|=2p\ge p','p is arbitrary; we choose w after p is given. Choosing a fixed short string would not cover all possible pumping lengths.'),
 ('Constrain every legal split',r'w=xyz,\quad |xy|\le p,\quad |y|>0\Rightarrow y=0^k,\ 1\le k\le p','The entire prefix xy lies in the first p zeros. This covers all legal decompositions, rather than selecting a convenient one.'),
 ('Pump down and contradict membership',r'xy^0z=0^{p-k}1^p\notin L','Removing at least one zero leaves unequal counts. The regular pumping lemma requires every nonnegative exponent to remain in L for some legal split, and no split can satisfy that.')],
 'L is not regular.','The contradiction uses both |xy|≤p and |y|>0. Forgetting either constraint would allow decompositions that the proof has not ruled out.')
W('7-deadlock',0,'One resource type. Available=1; P1 holds 1 with maximum 2; P2 holds 1 with maximum 3.','Determine whether the state is safe.','Use a private Work variable and find an order of hypothetical completions.',[
 ('Compute remaining needs',r'Need_1=2-1=1,\quad Need_2=3-1=2,\quad Work=1','Maximum claims are totals, not additional requests. Need is the remaining claim after currently held resources.'),
 ('Finish P1 hypothetically',r'Need_1\le Work,\quad Work\leftarrow1+Allocation_1=2','P1 can receive its remaining resource and complete. In the safety algorithm, adding its original allocation captures the net increase after borrowed Work is returned.'),
 ('Finish P2 hypothetically',r'Need_2=2\le Work=2,\quad Work\leftarrow2+1=3','Every process can finish in order P1,P2, so this is a safe sequence. P2 could not have been chosen first at Work=1.')],
 'Safe; a safety witness is P1 followed by P2.','Final Work=3 equals total system resources: initial Available 1 plus both original allocations. Adding Max instead would incorrectly create resources.')
W('7-scheduling',0,'P1 and P2 arrive at time 0; CPU bursts 3 and 5; FCFS order P1,P2; no switch overhead.','Compute mean waiting and turnaround times.','Construct the timeline, then calculate each metric separately.',[
 ('Build the Gantt chart',r'P_1:[0,3],\qquad P_2:[3,8]','Both are present initially. The stated order breaks the arrival tie; a different tie order would change mean waiting.'),
 ('Calculate waiting',r'W_1=0,\ W_2=3,\quad\overline W=(0+3)/2=1.5','FCFS is nonpreemptive here, so each process waits only before its first execution.'),
 ('Calculate turnaround',r'T_1=3-0=3,\ T_2=8-0=8,\quad\overline T=(3+8)/2=5.5','Turnaround includes both waiting and CPU service. It is measured from arrival to completion.')],
 'Mean waiting 1.5; mean turnaround 5.5 time units.','For each process T=W+B: 3=0+3 and 8=3+5. Mean burst 4 plus mean waiting 1.5 equals mean turnaround 5.5.')
W('7-virtual-files',0,'Virtual byte address 5000; page size 4 KiB; virtual page 1 maps to frame 7.','Translate to a physical byte address.','Divide into quotient and remainder, translate only the quotient, preserve the offset.',[
 ('Convert page size',r'P=4\cdot1024=4096\ bytes','The page size determines the offset range 0…4095 and is the same for pages and frames.'),
 ('Split the virtual address',r'VPN=\lfloor5000/4096\rfloor=1,\quad offset=5000-4096=904','Quotient identifies the virtual page. Remainder identifies a byte within that page, and must be less than 4096.'),
 ('Substitute the physical frame',r'PA=7\cdot4096+904=29576','The page table supplies frame 7. Mapping relocates the page but preserves the byte’s offset.')],
 'Physical byte address 29,576.','Dividing 29,576 by 4,096 yields frame 7 and remainder 904, confirming the translation.')
W('8-normalization',0,'R(A,B,C), with FDs A→B and B→C and their logical consequences.','Find a key, violations and a lossless dependency-preserving decomposition.','Compute closures before testing normal forms; verify decomposition properties independently.',[
 ('Find a minimal key',r'A^+=\{A,B,C\}','A determines B, then B determines C. No dependency can introduce A, so every key must contain A; A alone is the sole candidate key.'),
 ('Test the violating dependency',r'B^+=\{B,C\},\qquad B\not\to A','B is not a superkey, and C is nonprime because the only candidate key is A. The nontrivial B→C fails both BCNF and 3NF.'),
 ('Decompose and prove losslessness',r'R_1=AB,\quad R_2=BC,\quad R_1\cap R_2=\{B\},\quad B\to BC','The shared attribute determines all of R₂, satisfying the binary lossless-join criterion. A mere shared attribute would not be sufficient.'),
 ('Verify preservation and resulting normal forms',r'A\to B\text{ in }AB,\qquad B\to C\text{ in }BC','Each original dependency can be checked locally. A and B respectively are keys of their new relations, so both relations are in BCNF.')],
 'AB and BC form a lossless, dependency-preserving BCNF decomposition.','Join projections of any relation satisfying the FDs: a B value can have only one C, preventing spurious alternative C values for an A.')
W('9-fragmentation',0,'IPv4 total length 4000 bytes; fixed 20-byte header without options; MTU 1500.','Calculate every fragment’s total length, offset and MF bit.','Partition payload only, preserve eight-byte alignment for nonfinal fragments, then restore each header.',[
 ('Separate header from payload',r'P=4000-20=3980\ bytes','The original total length includes one header. Headers added to fragments are not part of the original payload offsets.'),
 ('Find the nonfinal capacity',r'D=8\left\lfloor\frac{1500-20}{8}\right\rfloor=1480\ bytes','Each fragment needs its own header and cannot exceed MTU. Nonfinal data sizes must be multiples of eight.'),
 ('Partition and add headers',r'3980=1480+1480+1020,\quad lengths=(1500,1500,1040)','The final remainder need not be divisible by eight. Add 20 bytes independently to each payload piece.'),
 ('Calculate offsets and flags',r'offsets=(0,1480/8,2960/8)=(0,185,370),\quad MF=(1,1,0)','Offsets count original payload bytes before the fragment in eight-byte units. Only the last fragment has no more fragments after it.')],
 'Lengths 1500, 1500, 1040; offsets 0, 185, 370; MF 1, 1, 0.','Payload sizes sum to 3980 and all fragment lengths are ≤1500. Total transmitted bytes are 4040 because two additional IP headers were introduced.')
W('10-quantitative',0,'Initial value 100; a 20% increase followed by a 20% decrease.','Find final value and net percentage change.','Apply each percentage to its current base, using multiplication rather than subtracting percentages.',[
 ('Apply the increase',r'P_1=100(1+0.20)=120','The first percentage has base 100.'),
 ('Apply the decrease to its actual base',r'P_2=120(1-0.20)=96','The second percentage has base 120. Its absolute decrease is 24, larger than the original increase 20.'),
 ('Measure change relative to the original',r'\frac{96-100}{100}\cdot100\%=-4\%','Net percentage must use the initial value as denominator, not 120 or 96.')],
 'Final value 96; overall decrease 4%.','For equal fractional increase/decrease r, (1+r)(1−r)=1−r². With r=0.2, the loss is 0.04=4%.')

def A(id,index,strategy,why,verification):
 """Retain the original trace while adding the justification for each transition."""
 e=lessons[id]['examples'][index];old=e['steps']
 assert len(old)==len(why),id
 e.update(strategy=strategy,steps=[{'title':title,'equation':'','explanation':step+' '+reason} for title,step,reason in zip(['Set up the state','Apply the rule','Interpret the result'],old,why)],answer=old[-1],verification=verification)
A('1-boolean',0,'Use a Boolean identity at each transformation, rather than ordinary arithmetic.',[
'Complementarity makes B+¬B=1 for either Boolean B; multiplication by A then leaves A.',
'The removed terms together cover every case where A is true. Keep the remaining AC term until absorption is justified.',
'When A=0, both terms are zero; when A=1, the first term already forces output one. Thus C cannot change the result.'],
'Try A=0 and A=1 with both C values; the output always equals A. Boolean + is OR, so 1+1=1 here.')
A('1-kmap-tabular',0,'Enumerate binary minterms and retain only literals constant across the group.',[
'Use ABC bit order consistently: changing the assumed variable order changes the resulting literal.',
'The group is a complete power-of-two block, so all four B,C combinations are represented. A varying literal is unnecessary.',
'The literal is complemented because the retained A bit is zero, not one.'],
'¬A is true exactly for minterms 0 through 3, and false for minterms 4 through 7; this checks the entire truth table.')
A('1-combinational',0,'Evaluate sum and carry independently, then read them as a two-bit number.',[
'XOR represents addition modulo two, so the sum bit records the parity of the three inputs.',
'Each product tests one pair of high inputs. OR of these products is one precisely when at least two inputs are high.',
'Carry is the higher-weight bit; reversing the pair would incorrectly turn decimal two into one.'],
'Direct arithmetic gives 1+1+0=2; binary Cout,S=10 has the same value.')
A('1-sequential',0,'Use the number of distinguishable states to bound the required storage bits.',[
'A modulo-10 counter must remember its current residue, so two different residues cannot share the same encoding.',
'The smallest sufficient bit count is the ceiling of log₂10. Rounding down fails to represent two required states.',
'Capacity alone does not specify next-state logic. Unused encodings must have defined behavior if recovery is required.'],
'Four bits provide 16 encodings: 10 legal plus 6 unused. Three bits provide only 8 and cannot implement the required states.')
A('1-representation',0,'Use invert-and-add-one, then verify with the negative weight of the most significant bit.',[
'Start with the positive magnitude using exactly eight bits; the width determines both inversion and the signed range.',
'Invert every bit at that width and add one modulo 256. Merely setting the sign bit would create a different encoding system.',
'The sign bit carries weight −128; the remaining bits carry positive powers of two. This decodes the result independently.'],
'11111011 has unsigned value 251; signed two’s complement subtracts 256, giving −5.')
A('2-instructions',0,'Scale an element index by element width before adding the base address.',[
'The address space is byte-addressed. An index counts elements, so multiplying by four converts it into bytes.',
'The base addresses element zero; index three is the fourth element and lies twelve bytes beyond that base.',
'Pointer arithmetic must use units consistently: element indices cannot be added as unscaled byte offsets.'],
'Elements start at 1000, 1004, 1008 and 1012, so index 3 corresponds to 1012.')
A('2-alu-control',0,'Implement subtraction as addition of the width-limited two’s complement of the subtrahend.',[
'Both operands fit in four-bit signed representation; retain that width throughout the bit calculation.',
'Bitwise inversion plus the carry-in forms −3 modulo 16. Include the extra carry in the intermediate sum before truncating.',
'An n-bit adder returns its low n result bits. Carry out does not by itself indicate signed overflow.'],
'Low four bits 0010 represent +2, and +5−3 lies within the signed range −8…7, so signed overflow does not occur.')
A('2-memory-io',0,'Separate word-width expansion from the number of addressable words.',[
'Two chips receive the same address and supply different byte lanes to build each 16-bit word.',
'Four independent banks provide four times the word count. Bank selection must enable only the addressed bank.',
'Multiplying the two expansion factors counts all physical chips; address bits select words, not individual bit lanes.'],
'Eight chips each store 1024×8 bits, totaling 65536 bits; the target 4096×16 bits has the same capacity.')
A('3-c-memory',0,'Track array extent, pointer scaling and parameter adjustment as separate C rules.',[
'sizeof sees an actual array object in this scope and counts all five elements, with no array-to-pointer conversion.',
'Adding two to an int pointer advances by two int objects, not two bytes. The resulting pointer remains inside the array.',
'An array-form parameter declaration is adjusted to a pointer parameter. Its sizeof therefore uses the platform’s pointer width.'],
'From &a[1], two further element positions lead to &a[3]; byte displacement is 2×4=8.')
A('3-recursion',0,'Maintain one program position per active call and resume after the recursive call returns.',[
'The first print occurs before recursion, so descending calls produce decreasing values.',
'The base case prints nothing. Returning resumes f(1) after its call statement, rather than restarting the function.',
'The final print belongs to the suspended outer frame; it runs only after the inner call has completed.'],
'Each nonbase call prints twice. Two such calls give four values, and the before/after arrangement makes 2,1,1,2 symmetric.')
A('3-linear-structures',0,'Trace a stack after every token; operators consume operands and push their result.',[
'Operands are pushed in encounter order. Addition removes two values and replaces them with one, reducing stack size by one.',
'The earlier addition’s result is an operand for multiplication, so postfix order directly represents evaluation dependencies.',
'A well-formed binary postfix expression finishes with exactly one value. The first popped operand is the right operand.'],
'The equivalent infix expression is (2+3)×4=20. For “2 3 −”, correct popping gives 2−3=−1, not 1.')
A('3-trees-bst',0,'Insert by comparisons, then use traversal visit rules rather than the order of insertion.',[
'Each new key follows smaller-left and larger-right from the root, so insertion order determines shape.',
'Once at node 2, keys 1 and 3 are compared with 2; both still belong in the left subtree of 4.',
'Inorder visits left/node/right; preorder visits node/left/right. Applying those rules yields different sequences.'],
'The inorder sequence is sorted, which checks the BST invariant. The preorder starts with root 4, as required by its visit rule.')
A('3-heaps-graphs',0,'Append to preserve completeness, then repair heap order only along the ancestor path.',[
'Appending in array order fills the next complete-tree position; inserting arbitrarily would break the shape property.',
'For zero-based indexing the parent is floor((i−1)/2). Compare with that parent and swap only when heap order is violated.',
'The second swap reaches the root. Other branches were already ordered and do not need global sorting.'],
'In [2,3,4,5], 2≤3, 2≤4 and 3≤5, so all parent-child inequalities hold; a heap need not be a fully sorted array.')
A('4-search-sort',0,'Maintain an inclusive interval containing every possible target location.',[
'The midpoint value is smaller than 7. Sorted order rules out the entire left part, including the tested midpoint.',
'Using floor((low+high)/2) on [3,4] gives index 3. Equality ends the search immediately.',
'Discarding an unsorted half would lack justification; the sorted-input precondition proves preservation of the candidate invariant.'],
'The array’s zero-based element at index 3 is 7. Every update reduces the remaining interval, ensuring termination.')
A('4-hashing',0,'Follow the stated collision-resolution rule at every occupied position.',[
'A collision does not replace the existing key. Begin the permitted probe sequence from the computed home bucket.',
'Each probe must use the same capacity and formula, wrapping modulo capacity if it passes the last position.',
'Place the key at the first permitted empty slot, and use that same probe sequence later during search.'],
'Retracing the insertion’s probe sequence must encounter the inserted key before a never-used empty slot.')
A('4-greedy-divide',0,'State why the greedy choice is safe for the particular problem variant.',[
'Compare options using the rule given in the problem, including any feasibility constraint.',
'A choice is globally justified only if an exchange argument can replace an optimal solution’s alternative without worsening it.',
'Recompute the residual problem after each choice. A ratio rule for divisible items is not automatically valid for indivisible items.'],
'Check the selected construction’s feasibility and compare against the provided alternative; a single better feasible solution refutes optimality.')
A('4-dynamic',0,'Define the DP state before using the include/exclude recurrence.',[
'Each state summarizes an optimum under a specific prefix/capacity restriction; this meaning prevents accidental item reuse.',
'The include branch uses remaining capacity and the preceding item prefix, while the exclude branch keeps capacity unchanged.',
'Taking the better feasible branch explores both possibilities for the last item rather than committing to a local ratio choice.'],
'Confirm every included item appears at most once and the total weight fits capacity. Recompute total value from the selected items.')
A('4-graph-algorithms',0,'Trace the chosen graph algorithm with the representation and edge directions stated.',[
'Initialize a discovered or distance state explicitly so unreachable vertices are not silently assigned ordinary values.',
'Each traversal operation must inspect the neighbors of the removed vertex, not all visually nearby vertices in a diagram.',
'The result follows the algorithm’s invariant; parent pointers represent its constructed routes rather than an arbitrary drawing.'],
'Each recorded parent edge must exist in the graph and lead back toward the traversal source without forming a parent cycle.')
A('4-bfs-dfs',0,'Use the queue’s first-in-first-out order to expose distance layers.',[
'Mark each vertex when it is first enqueued, preventing multiple pending copies through different neighbors.',
'The queue keeps earlier layers ahead of later layers. Neighbor order may change parent choices within the same layer.',
'An assigned BFS distance counts edges from the source. This interpretation requires an unweighted or unit-weight objective.'],
'Each discovered vertex’s distance is one more than its parent’s distance; already visited neighbors should not be re-enqueued.')
A('4-minimum-spanning',0,'Accept edges in increasing weight only when they join different components.',[
'The graph and edge weights determine the candidate ordering; equal weights can permit multiple valid choices.',
'Joining separate components preserves acyclicity. Reject an edge whose endpoints are already connected by chosen edges.',
'A connected V-vertex tree must have V−1 edges. Sum accepted weights rather than the weights of all inspected edges.'],
'Chosen edges must connect all vertices and contain no cycle; compare the total with the original weights, not a shortest-path distance.')
A('4-shortest-paths',0,'Finalize the smallest tentative distance, then relax its outgoing edges.',[
'These first estimates are route costs through A; they remain tentative until the corresponding vertex is finalized.',
'B’s distance 2 plus edge BC of weight 1 improves C’s former estimate 7 to 3. Relaxation keeps the cheaper candidate.',
'Nonnegative weights justify finalization. The predecessor of C is updated to B when the improved route is selected.'],
'The route A→B→C costs 2+1=3, less than direct A→C cost 7. Distances never increase under relaxation.')
A('5-automata',0,'Give each state a meaning that the transition rules preserve.',[
'The empty input has zero ones, so the start state must be both even and accepting.',
'Appending zero preserves the count of ones; keeping the state establishes the parity invariant.',
'Appending one flips the count’s parity exactly once. Acceptance after the whole input then corresponds to even parity.'],
'Trace ε, 0, 1, 11 and 101: their parity results agree with the state meanings, without counting the number of zeros.')
A('5-cfg-pda',0,'Record each sentential form and the production applied to its remaining nonterminal.',[
'The recursive production contributes one leading zero and one trailing one, with S representing the unfinished interior.',
'A second recursive expansion nests another matched pair; the terminals remain in zero-then-one block order.',
'The epsilon production removes only S, not its surrounding terminals. This completes the terminal string.'],
'Two recursive expansions yield two zeros and two ones; the resulting 0011 is exactly the target string.')
A('5-cfl-pumping',0,'Cover all legal pumping windows, not one chosen decomposition.',[
'The witness depends on p and belongs to the language. The three blocks each have p symbols, creating separated dependencies.',
'Any window containing a symbol of both the first and third blocks would include all p middle symbols and exceed length p.',
'At least one pumped part is nonempty. Removing it changes some count while at least one untouched block remains length p.'],
'Handle boundary-straddling windows as well as single-block windows; even when two counts change equally, the third unchanged count breaks equality.')
A('5-decidability',0,'Interleave simulations to avoid waiting forever for one recognizer to reject.',[
'Use separate saved machine configurations and alternate their steps; both simulations receive unbounded progress.',
'The recognizer for the correct side eventually accepts, so its answer determines membership without needing the other to halt.',
'Exactly one side contains any given input. This supplies the termination proof that each recognizer alone lacks.'],
'For a member, the L simulation accepts; for a nonmember, the complement simulation accepts. Both cases terminate under dovetailing.')
A('6-lexical',0,'Identify maximal token lexemes, then assign token categories.',[
'The two identifiers are different lexemes but belong to the same token kind. Spaces separate text but are not emitted here.',
'The numeric literal is one token despite containing two digits; punctuation also contributes a token.',
'Count emitted tokens rather than characters or distinct categories. A repeated category still creates a new token occurrence.'],
'The token sequence is identifier, assignment, identifier, plus, number, semicolon: six occurrences.')
A('6-parsing',0,'Propagate FIRST past nullable prefixes until a nonnullable symbol is encountered.',[
'FIRST(A) contains a and epsilon. Epsilon means A may contribute no terminal to the start of a derived S string.',
'The terminal after nullable A therefore supplies another possible first symbol.',
'The entire right-hand side cannot vanish because b is mandatory, so epsilon must not enter FIRST(S).'],
'S derives either ab or b under this grammar; their first terminals are exactly a and b.')
A('6-translation-runtime',0,'Evaluate child attributes after the parse structure fixes operator precedence.',[
'The multiplication subtree is evaluated before its parent addition, because the parse groups 3*4 together.',
'The child attribute values are inputs to the addition node’s synthesized attribute.',
'The result belongs to this parse tree. Evaluating source tokens left-to-right without precedence would incorrectly give 20.'],
'Independent arithmetic 2+(3×4)=14 agrees. If the grammar were ambiguous, the tree would need to be specified first.')
A('6-ir-dataflow',0,'Emit one three-address operation per expression-tree computation in dependency order.',[
'The product is a prerequisite for addition, so its temporary must be defined first.',
'The addition refers to the already computed product temporary, preserving precedence without parentheses in the IR.',
'The final copy stores the expression result in a; temporary naming is arbitrary but dependency order is not.'],
'Substitute t1=c*d into t2=b+t1 and then into a=t2 to reconstruct a=b+c*d.')
A('7-processes',0,'Classify a process by what prevents its next instruction from executing.',[
'Its CPU work is executable but it has not been chosen; this is ready, not blocked.',
'The required data/event is not available, so assigning CPU alone cannot make the pending operation progress.',
'Event completion removes the blocking condition; scheduling is a separate decision that selects among ready processes.'],
'A ready process needs CPU selection; a blocked process needs an event first. These are different waiting queues.')
A('7-synchronization',0,'Split increment into read, compute and store, then interleave legal events.',[
'Both reads can occur before either write because the compound update is not protected atomically.',
'Each computation uses its own saved read value zero, so both stores write the same one.',
'The final store overwrites the same value instead of accumulating both increments. The protected region must include the read.'],
'The interleaving respects each thread’s local order yet ends at 1. Serializing complete increments gives 2, proving the race changes the outcome.')
A('7-files',0,'Count reachable data blocks separately from the indirect metadata block.',[
'An indirect block’s entries are four-byte addresses; dividing block bytes by pointer bytes gives 256 data pointers.',
'The ten direct blocks are additional to the indirect block’s 256 target blocks.',
'File data capacity counts user-data blocks; the index block consumes storage but is not another user-data block.'],
'266×1024=272384 bytes. Allocating every reachable data block also requires the separate indirect metadata block.')
A('8-er-relations',0,'Represent the many-to-many relationship explicitly and derive its key from event uniqueness.',[
'Entity identifiers are inherited into the relationship to state which student and which course participate.',
'Neither a student nor a course alone identifies an enrollment, because each can participate many times.',
'The pair is minimal only under the one-enrollment-per-student/course assumption; adding repeated terms changes that constraint.'],
'One student in two courses and two students in one course produce distinct pairs without duplicating entity details or losing relationship grades.')
A('8-queries',0,'Form groups before evaluating a predicate over their aggregate count.',[
'Rows with the same department value contribute to the same aggregate group.',
'COUNT(*) counts the rows in each group and HAVING applies the threshold to that computed group result.',
'A row-level WHERE condition cannot use the aggregate count of a group that has not yet been formed.'],
'A department with two rows is absent, one with three rows appears with count 3; SELECT and GROUP BY use the same grouping attribute.')
A('8-storage-index',0,'Count child pointers per level and keep leaf entry capacity out of leaf-node count.',[
'Level numbering starts at the root as level 1; three levels therefore contain two pointer expansions.',
'Each of the four internal nodes can supply four independent leaf children under the maximum-fanout assumption.',
'This is the maximum number of leaf pages, not the maximum records. Record capacity additionally requires entries per leaf.'],
'Level counts are 1,4,16. Multiplying by four a third time would erroneously count an extra level.')
A('8-transactions',0,'Build precedence edges only for same-item conflicts across different transactions.',[
'A write followed by another transaction’s read conflicts, so any equivalent serial order must place T1 before T2.',
'The conflict on Y imposes the opposite ordering, T2 before T1.',
'No serial transaction order can satisfy both directions; the two-edge cycle is a certificate of conflict nonserializability.'],
'Try serial T1,T2 and T2,T1: the former violates the Y constraint, the latter violates the X constraint. Commit/recovery properties are separate.')
A('9-layers-switching',0,'Convert packet bytes to bits, then divide by bit rate.',[
'The rate is given in bits per second, so leaving packet size in bytes would undercount time by a factor of eight.',
'Mbps uses decimal millions here; the resulting quotient is in seconds.',
'This calculation concerns serialization only. Distance or router delays cannot be inferred from packet size and link rate alone.'],
'12,000 bits at 12,000,000 bits/s is 1/1000 s=1 ms, with consistent dimensions.')
A('9-link-layer',0,'Evaluate parity detection separately from correction capability.',[
'The sender chooses the parity bit so the complete protected word has an even number of ones.',
'One bit flip changes the number of ones by plus or minus one, which reverses its parity.',
'Mismatch reports inconsistency but does not identify which of the possible bit positions changed.'],
'Two flipped bits can restore even parity and escape detection; the result is a single-bit detection guarantee, not an arbitrary-error guarantee.')
A('9-routing',0,'Add each local link cost to that neighbor’s advertised remaining distance.',[
'The advertisement excludes the cost of reaching the neighbor, so that local cost must be included.',
'A more expensive first hop can still have a cheaper end-to-end route because its advertised suffix is shorter.',
'The decision compares complete candidate route totals, not individual links in isolation.'],
'Via A costs 2+5=7; via B costs 4+1=5. Choosing B minimizes the advertised total under this snapshot.')
A('9-ipv4',0,'Find the aligned CIDR block by host-bit width and boundary multiples.',[
'Prefix length 26 leaves 32−26=6 host bits, giving 64 total addresses per block.',
'Integer division of the final octet by 64 identifies its block: floor(70/64)=1, beginning at 64.',
'Under conventional subnet semantics the first and last addresses are network and broadcast; they are excluded from the host range.'],
'70 AND 192 gives 64 in the last octet. The host range contains 62 addresses, from 65 through 126 inclusive.')
A('9-tcp-web',0,'Apply both window limits, then subtract data already in flight.',[
'All sizes are in bytes. Outstanding data already consumes window space even if it has not yet been acknowledged.',
'The smaller window governs because satisfying only the larger one can violate receiver or network constraints.',
'New data allowance is unused window capacity, not the entire window. A negative result would mean no new data can be sent.'],
'4000 outstanding plus 6000 new bytes equals 10000, exactly the congestion limit and within the receiver limit.')
A('9-sockets',0,'Frame the application message independently of TCP send and receive call boundaries.',[
'Both peers must agree on prefix size, byte order and length semantics before interpreting payload bytes.',
'A short positive write sends only part of the buffer; continue from the first unsent byte rather than retransmitting already sent bytes.',
'The receiver accumulates exactly the declared payload length. A short read does not indicate the message ended.'],
'The reconstructed payload must contain five bytes spelling hello; surplus received bytes may belong to the next framed message.')
A('9-dns',0,'Follow referrals until the appropriate authoritative answer is obtained.',[
'The stub asks for recursive service; it need not itself contact every level of the hierarchy.',
'Root and TLD typically return delegation information, not the final address for the requested host.',
'Caching changes later paths and delay counts; TTL constrains reuse instead of making an answer permanent.'],
'Confirm the final answer is authoritative for the requested name or follow its alias; do not treat a referral as the host-address answer.')
A('9-http',0,'Distinguish a completed HTTP exchange with an error status from a failed transport connection.',[
'Receiving an HTTP status line implies that an application-level response was exchanged over an established transport.',
'404 concerns the requested resource, not the inability to contact the server at all.',
'Connection refusal prevents the request/response exchange; retrying it is a different diagnostic path from inspecting a 404 URL.'],
'A response status and body can be displayed for HTTP 404. With connection refusal there may be no HTTP response to parse.')
A('10-verbal-reasoning',0,'Translate “immediately before” into an adjacent ordered pair and apply the remaining position constraint.',[
'The pair can start only at position 1 or 2 in a three-position arrangement.',
'If the pair occupies 2,3 there is no position right of B for C. This eliminates that case rather than merely making it unlikely.',
'The surviving arrangement satisfies both adjacency and the after-B condition.'],
'In A,B,C, B follows A immediately and C is right of B. All three positions are filled exactly once.')
W('4-graph-algorithms',0,'Undirected triangle AB=1, BC=2, AC=5.','Find the MST and the shortest route from A to C.','Compute the two objectives independently, even when they happen to agree.',[
 ('Build the minimum spanning tree',r'E_T=\{AB,BC\},\quad w(T)=1+2=3','The two cheapest edges connect all three vertices without a cycle. An MST minimizes total connecting-edge weight, not a source-to-destination distance.'),
 ('Compare both simple A-to-C routes',r'w(A\to C)=5,\quad w(A\to B\to C)=1+2=3','These are the only two simple routes in this triangle. Positive weights mean adding a cycle cannot improve either route.'),
 ('Report separate results',r'w(MST)=3,\quad d(A,C)=3','Both values are 3 here, but this is an instance-specific coincidence. A shortest-path tree can differ from an MST on another graph.')],
 'MST edges AB,BC have total 3; shortest A-to-C route is A,B,C with cost 3.','Changing AC to 2.5 makes the shortest A-to-C route direct, while the MST remains AB,BC with weight 3; the objectives can diverge.')
W('4-greedy-divide',0,'Activities [1,3], [2,5], [3,4], [4,7]; sharing an endpoint is permitted.','Select a largest compatible subset.','Sort by finish time and repeatedly take the earliest-finishing compatible activity.',[
 ('Order by finish time',r'[1,3],\ [3,4],\ [2,5],\ [4,7]','Finishing earlier leaves at least as much room for later activities. An optimal solution’s first activity can be replaced by this earliest finisher without reducing how many later activities fit.'),
 ('Select and update the boundary',r'[1,3]\to[3,4],\qquad2<4\Rightarrow[2,5]\text{ rejected}','Compatibility is start≥last selected finish. After taking [3,4], the interval [2,5] starts too early and overlaps.'),
 ('Complete the selection',r'4\ge4\Rightarrow[4,7]\text{ selected},\quad count=3','Equal endpoints are allowed by the stated convention. Under strict non-touching semantics these choices would need a different feasibility test.')],
 'Three activities: [1,3], [3,4], [4,7].','All four cannot be selected because [2,5] overlaps [1,3] and [3,4]. A feasible size-three solution attains the largest remaining possible count.')
def M(id,index,strategy,equations,explanations,verification):
 e=lessons[id]['examples'][index]
 assert len(equations)==len(explanations)>=3,id
 answer=e['steps'][-1] if isinstance(e['steps'][-1],str) else e['answer']
 e.update(strategy=strategy,steps=[{'title':title,'equation':eq,'explanation':why} for title,eq,why in zip(['Translate the condition','Calculate carefully','Conclude and interpret'],equations,explanations)],answer=answer,verification=verification)
M('0-propositions',1,'Try to make the conclusion false while keeping both premises true.',
 [r'\neg(P\to R)\Rightarrow P=T,\ R=F',r'P\to Q=T,\ P=T\Rightarrow Q=T',r'Q\to R=T,\ Q=T\Rightarrow R=T'],
 ['A false implication requires a true antecedent and false consequent. These values are forced by the attempted counterexample.', 'Since P is true, the first premise can remain true only if Q is also true.', 'The second premise then forces R true, contradicting the R=false requirement. No satisfying assignment to the premises falsifies the conclusion.'],
 'This is implication chaining, also called hypothetical syllogism. The counterexample test verifies it without presuming the conclusion.')
M('0-quantifiers',1,'Track whether y can depend on x or must be fixed before x is known.',
 [r'\forall x\exists y:\ y=-x\Rightarrow x+y=0',r'\exists y\forall x:\ x=0\Rightarrow y=0',r'x=1\Rightarrow y=-1\ne0'],
 ['For the first statement, a different witness is allowed for each integer x. The formula −x always remains in the integer domain.', 'For the second statement one single y must work for every x. Testing x=0 forces that common witness to be zero.', 'Testing x=1 forces a different witness, making the universal requirement impossible for one fixed y.'],
 'The distinction is dependency of the witness, not whether some individual pair x,y satisfies the equation.')
M('0-sets-functions',0,'Verify each equivalence axiom under divisibility of the difference.',
 [r'3\mid(a-a)=0',r'3\mid(a-b)\Rightarrow3\mid(b-a)',r'3\mid(a-b),\ 3\mid(b-c)\Rightarrow3\mid(a-c)'],
 ['Zero is divisible by three, proving reflexivity for every integer a.', 'Negating a multiple of three gives another multiple, proving symmetry.', 'Adding the two differences gives a−c, proving transitivity. These three properties establish equivalence; its classes are residues 0, 1 and 2.'],
 'Any integer has exactly one remainder modulo three, so the three classes are disjoint and cover the integers.')
M('0-orders-lattices',1,'Use divisibility comparisons inside the given set only.',
 [r'2\nmid3,\quad3\nmid2',r'\operatorname{Minimal}=\{2,3\},\quad\operatorname{Least}\text{ does not exist}',r'2\mid6,\quad3\mid6'],
 ['Neither 2 nor 3 has a distinct predecessor in {2,3,6}. They are incomparable, not ordered by their numerical sizes.', 'A least element would have to divide both 2 and 3. No member of the given set does, although two minimal elements exist.', 'Six is above every member under divisibility, so it is greatest. The absent integer 1 cannot be used as the set’s least element.'],
 'Minimality rules out an element strictly below that candidate; leastness requires that candidate below every element. The two definitions are unequal.')
M('0-algebraic-structures',1,'Solve for the identity of addition, not the identity of multiplication.',
 [r'5+x\equiv0\pmod8',r'x\equiv-5\equiv3\pmod8',r'5+3=8\equiv0\pmod8'],
 ['An additive inverse must combine with 5 to yield additive identity zero.', 'Choose the representative 3 from residues 0 through 7. Inverses are unique as residue classes, not as unrestricted integers.', 'Direct substitution verifies the required operation. A multiplicative-inverse calculation would solve a different condition.'],
 'Both 3 and 11 are integer representatives of the same inverse class, but the conventional residue answer is 3.')
M('0-graphs-matching',1,'Use one deficient subset as a certificate that Hall’s condition fails.',
 [r'X=\{a,b,c\},\quad N(a)=N(b)=\{1\},\quad N(c)=\{2,3\}',r'S=\{a,b\}\Rightarrow N(S)=\{1\}',r'|N(S)|=1<2=|S|'],
 ['Every left vertex has at least one neighbor, but that local check does not guarantee distinct representatives.', 'The two vertices a and b compete for the same sole available right vertex.', 'A matching saturating X would need two distinct partners for S, which its neighbor set cannot supply. One failing subset refutes Hall’s universal requirement.'],
 'Any matching can cover at most one of a,b, regardless of whether c is matched to 2 or 3.')
M('0-counting',1,'Count the complement when it has only one case.',
 [r'N_{all}=2^4=16',r'N_{no\ 1}=1\quad(0000)',r'N_{at\ least\ one\ 1}=16-1=15'],
 ['Each of four positions independently has two possibilities, so multiplication gives all binary strings.', 'Having no one forces every position to zero. There is exactly one such string, not four.', 'The desired set and its complement partition all strings. Subtract once rather than picking a position that can double-count strings with several ones.'],
 'Counting by exact number of ones gives C(4,1)+C(4,2)+C(4,3)+C(4,4)=4+6+4+1=15.')
M('0-recurrences',1,'Express the generating function using geometric-series identities.',
 [r'A(x)=\sum_{n\ge0}(2n+3)x^n=2\sum_{n\ge0}nx^n+3\sum_{n\ge0}x^n',r'A(x)=\frac{2x}{(1-x)^2}+\frac3{1-x}',r'A(x)=\frac{3-x}{(1-x)^2}'],
 ['Linearity splits the sequence into an arithmetic part and a constant part. The sum begins at n=0.', 'The geometric series gives 1/(1−x); differentiating it and multiplying by x gives the n-weighted sum. Interpret as formal series, or assume |x|<1 analytically.', 'Bring terms over the common squared denominator: 2x+3(1−x)=3−x.'],
 'Expanding gives 3+5x+7x²+…, agreeing with a₀=3, a₁=5 and a₂=7.')
M('0-matrices-rank',1,'Use the 2×2 determinant and adjugate, then multiply to verify.',
 [r'A=\begin{bmatrix}1&2\\3&4\end{bmatrix},\quad\det A=1\cdot4-2\cdot3=-2',r'A^{-1}=\frac1{-2}\begin{bmatrix}4&-2\\-3&1\end{bmatrix}',r'AA^{-1}=\begin{bmatrix}1&0\\0&1\end{bmatrix}'],
 ['A nonzero determinant establishes invertibility and full rank. Trace or signs of individual entries do not establish this.', 'Swap diagonal entries and negate off-diagonal entries to form the adjugate, then divide every entry by the determinant.', 'Matrix multiplication verifies the candidate, and shows why dropping the negative denominator would be wrong.'],
 'Determinant of the inverse is −1/2, the reciprocal of −2. The product A times its inverse is identity.')
M('0-eigen-lu',1,'Record elimination multipliers in L and the reduced coefficients in U.',
 [r'm_{21}=4/2=2,\quad R_2\leftarrow R_2-2R_1=[0,1]',r'L=\begin{bmatrix}1&0\\2&1\end{bmatrix},\quad U=\begin{bmatrix}2&1\\0&1\end{bmatrix}',r'LU=\begin{bmatrix}2&1\\4&3\end{bmatrix}=A'],
 ['The first pivot is nonzero, so no row swap is needed. Apply the multiplier across the entire row.', 'L stores the positive elimination multiplier under a unit diagonal; U stores the upper-triangular result.', 'Reconstruction checks both sign and placement of the multiplier. With pivoting, the relationship would be PA=LU for the chosen convention.'],
 'det(L)=1 and det(U)=2, so det(A)=2, also obtained directly as 2×3−4×1.')
M('0-limits-continuity',1,'Check function values and one-sided difference quotients separately.',
 [r'\lim_{x\to0}|x|=0=|0|',r'\lim_{h\to0^+}\frac{|h|-0}{h}=1',r'\lim_{h\to0^-}\frac{|h|-0}{h}=-1'],
 ['The value and two-sided limit agree, establishing continuity at zero.', 'On positive h, absolute value equals h, so the right-hand slope is one.', 'On negative h, absolute value equals −h. The unequal one-sided slopes mean the derivative does not exist, despite continuity.'],
 'The graph has a corner at zero: continuity permits a corner, differentiability does not.')
M('0-extrema-mvt',1,'Check hypotheses before solving the mean-value equation.',
 [r'f(x)=x^2\text{ is continuous on }[1,3]\text{ and differentiable on }(1,3)',r'\frac{f(3)-f(1)}{3-1}=\frac{9-1}{2}=4',r'f^{\prime}(c)=2c=4\Rightarrow c=2\in(1,3)'],
 ['A polynomial satisfies both required regularity conditions; this licenses use of the theorem.', 'The secant slope is change in function value divided by change in input.', 'Set the derivative equal to that slope and confirm the resulting c lies strictly inside the interval.'],
 'The tangent slope at c=2 is four, exactly matching the endpoint secant slope. MVT promises at least one such point, not uniqueness generally.')
M('0-integration',0,'Find an antiderivative and subtract its values at the two bounds.',
 [r'\frac{d}{dx}x^3=3x^2',r'\int_0^2 3x^2\,dx=[x^3]_0^2=2^3-0^3',r'\int_0^2 3x^2\,dx=8'],
 ['The power rule identifies x³ as an antiderivative; a constant would cancel in the definite evaluation.', 'The fundamental theorem converts the integral to upper-minus-lower values.', 'Since the integrand is nonnegative on the interval, the signed integral here also equals geometric area. This equivalence fails when positive and negative regions cancel.'],
 'Integrand increases from zero to twelve; the resulting area eight lies between zero and the rectangle bound 2×12=24.')
M('0-conditional-bayes',1,'Multiply a marginal probability by the correct conditional probability.',
 [r'P(A_1)=4/52',r'P(A_2\mid A_1)=3/51',r'P(A_1\cap A_2)=\frac4{52}\frac3{51}=\frac1{221}'],
 ['A₁ is an ace on the first draw. The standard deck has four aces among 52 cards.', 'Conditioned on an ace already being removed, three aces remain among 51 cards. The draws are not independent.', 'The multiplication rule uses a conditional second factor. Reusing 4/52 would silently change the experiment to replacement.'],
 'An unordered count gives C(4,2)/C(52,2)=6/1326=1/221, agreeing with the sequential calculation.')
M('0-random-statistics',1,'Calculate mean, median and mode according to their distinct definitions.',
 [r'\overline x=\frac{1+2+2+3+12}{5}=4',r'median=2,\quad mode=2',r'4>2'],
 ['The mean includes every observation, so the large final value has considerable influence.', 'For five sorted observations the third is the median. The value two also has the largest occurrence count.', 'The difference between mean and median signals this sample’s right-skewed extreme observation; the statistics need not coincide.'],
 'Removing 12 changes the mean to 2 while the central repeated values remain near 2, illustrating the mean’s sensitivity.')
M('0-binomial-poisson',1,'Convert the rate into a mean for the stated time window before using the PMF.',
 [r'\lambda=(2\ calls/min)(3\ min)=6',r'E[X]=\operatorname{Var}(X)=6',r'P(X=0)=e^{-6}\frac{6^0}{0!}=e^{-6}'],
 ['The Poisson model parameter is expected events over the entire interval, not the per-minute rate by itself.', 'For a Poisson count, both mean and variance equal its parameter. Standard deviation is √6, not six.', 'At zero, both the power and factorial equal one. The resulting probability is about 0.00248 under the homogeneous Poisson assumptions.'],
 'A longer interval has a larger mean and a smaller no-event probability; using e⁻² would describe one minute rather than three.')
M('0-continuous-distributions',0,'Integrate constant density over the part of the support that satisfies the event.',
 [r'f_X(x)=\frac1{8-2}=\frac16\quad(2\le x\le8)',r'P(3<X<5)=\int_3^5\frac16\,dx',r'P(3<X<5)=\frac{5-3}{6}=\frac13'],
 ['Uniform density normalizes the total area across the six-unit support to one.', 'Both event bounds lie inside the support; otherwise first intersect with [2,8]. A density value is not itself an interval probability.', 'Multiply constant density by interval length. Strict versus non-strict endpoints do not change a continuous distribution’s interval probability.'],
 'The event spans two of the support’s six units, so its probability must be 2/6. The entire support has probability 6/6=1.')
