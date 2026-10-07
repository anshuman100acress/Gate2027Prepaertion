"""Only reviewed expressions are typeset; never guess equations from prose/code."""
import re
from core import subjects
pairs=[
 ('[[1,2],[0,1]]',r'\begin{bmatrix}1&2\\0&1\end{bmatrix}'),
 ('[[3],[4]]',r'\begin{bmatrix}3\\4\end{bmatrix}'),
 ('[[11],[4]]',r'\begin{bmatrix}11\\4\end{bmatrix}'),
 ('[[1,2,3],[2,4,6],[1,1,1]]',r'\begin{bmatrix}1&2&3\\2&4&6\\1&1&1\end{bmatrix}'),
 ('[[1,2,0],[2,5,1],[0,1,3]]',r'\begin{bmatrix}1&2&0\\2&5&1\\0&1&3\end{bmatrix}'),
 ('[[2,0],[0,5]]',r'\begin{bmatrix}2&0\\0&5\end{bmatrix}'),
 ('[A|b]',r'[A\mid b]'),
 ('x+y+z=6',r'x+y+z=6'),('2x+3y+z=11',r'2x+3y+z=11'),('x+2y+3z=14',r'x+2y+3z=14'),
 ('f(x)=x²eˣ',r'f(x)=x^2e^x'),
 ('¬∀x∃y R = ∃x¬∃y R = ∃x∀y¬R',r'\neg\forall x\exists y\,R=\exists x\neg\exists y\,R=\exists x\forall y\neg R'),
 ('∀x∀y ¬R(x,y)',r'\forall x\forall y\ \neg R(x,y)'),('∃x∃y ¬R(x,y)',r'\exists x\exists y\ \neg R(x,y)'),('∃x∀y ¬R(x,y)',r'\exists x\forall y\ \neg R(x,y)'),('∀x∃y ¬R(x,y)',r'\forall x\exists y\ \neg R(x,y)'),('∀x∃y R(x,y)',r'\forall x\exists y\ R(x,y)'),
 ('∀s∃e Passed(s,e)',r'\forall s\exists e\ Passed(s,e)'),('∃s∀e ¬Passed(s,e)',r'\exists s\forall e\ \neg Passed(s,e)'),
 ('rank(A)=rank([A|b])=1',r'\operatorname{rank}(A)=\operatorname{rank}([A\mid b])=1'),('rank(A)=rank([A|b])',r'\operatorname{rank}(A)=\operatorname{rank}([A\mid b])'),('Ax=b',r'Ax=b'),
 ('¬Q→¬P',r'\neg Q\to\neg P'),('¬P→¬Q',r'\neg P\to\neg Q'),('P→Q',r'P\to Q'),('Q→P',r'Q\to P'),('Q→R',r'Q\to R'),('P→R',r'P\to R'),('P∧Q',r'P\land Q'),('P∨Q',r'P\lor Q'),('¬P∨Q',r'\neg P\lor Q'),('P↔Q',r'P\leftrightarrow Q'),
 ('g∘f',r'g\circ f'),('M=Mᵀ',r'M=M^T'),('Mᵢⱼ=1',r'M_{ij}=1'),('aᵢRaⱼ',r'a_iRa_j'),
 ('|A∪B∪C|=|A|+|B|+|C|−|A∩B|−|A∩C|−|B∩C|+|A∩B∩C|',r'|A\cup B\cup C|=|A|+|B|+|C|-|A\cap B|-|A\cap C|-|B\cap C|+|A\cap B\cap C|'),
 ('|A∪B|=|A|+|B|−|A∩B|',r'|A\cup B|=|A|+|B|-|A\cap B|'),('C(8,3)',r'\binom83'),('C(6,2)',r'\binom62'),('C(4,2)=6',r'\binom42=6'),('2³=8',r'2^3=8'),('2⁴=16',r'2^4=16'),('8×7×6=336',r'8\cdot7\cdot6=336'),('3!=6',r'3!=6'),('8!/(8−3)!',r'\frac{8!}{(8-3)!}'),('8³',r'8^3'),
 ('aₙ=2aₙ₋₁+1',r'a_n=2a_{n-1}+1'),('aₙ=3aₙ₋₁−2aₙ₋₂',r'a_n=3a_{n-1}-2a_{n-2}'),('λ²−3λ+2=0',r'\lambda^2-3\lambda+2=0'),('aₙ=A+B2ⁿ',r'a_n=A+B2^n'),('aₙ=2ⁿ−1',r'a_n=2^n-1'),('aₙ=2n+3',r'a_n=2n+3'),('nλⁿ',r'n\lambda^n'),('λⁿ',r'\lambda^n'),('2x/(1−x)²+3/(1−x)',r'\frac{2x}{(1-x)^2}+\frac3{1-x}'),('(3−x)/(1−x)²',r'\frac{3-x}{(1-x)^2}'),('2Σnxⁿ+3Σxⁿ',r'2\sum_{n\ge0}nx^n+3\sum_{n\ge0}x^n'),
 ('[[1,2],[3,4]]',r'\begin{bmatrix}1&2\\3&4\end{bmatrix}'),('[[2,1],[4,3]]',r'\begin{bmatrix}2&1\\4&3\end{bmatrix}'),('[[2,1],[0,3]]',r'\begin{bmatrix}2&1\\0&3\end{bmatrix}'),('[[2,1],[0,2]]',r'\begin{bmatrix}2&1\\0&2\end{bmatrix}'),('U=[[2,1],[0,1]]',r'U=\begin{bmatrix}2&1\\0&1\end{bmatrix}'),('L=[[1,0],[2,1]]',r'L=\begin{bmatrix}1&0\\2&1\end{bmatrix}'),('A⁻¹',r'A^{-1}'),('(A−2I)v=0',r'(A-2I)v=0'),('(2−λ)²',r'(2-\lambda)^2'),('(2−λ)(3−λ)',r'(2-\lambda)(3-\lambda)'),
 ('limₓ→₂ (x²−4)/(x−2)',r'\lim_{x\to2}\frac{x^2-4}{x-2}'),('x²−4=(x−2)(x+2)',r'x^2-4=(x-2)(x+2)'),('x²−4x+1',r'x^2-4x+1'),('f′(c)=2c=4',r'f^{\prime}(c)=2c=4'),('∫₀² 3x² dx',r'\int_0^2 3x^2\,dx'),('∫₀¹ 2x e^(x²) dx',r'\int_0^1 2xe^{x^2}\,dx'),('∫₀¹eᵘdu=e−1',r'\int_0^1e^u\,du=e-1'),('du=2x dx',r'du=2x\,dx'),('u=x²',r'u=x^2'),('|h|/h=1',r'|h|/h=1'),
 ('P(condition|positive)',r'P(\text{condition}\mid\text{positive})'),('90/1080=1/12≈8.33%',r'\frac{90}{1080}=\frac1{12}\approx8.33\%'),('(4/52)(3/51)=1/221',r'\frac4{52}\frac3{51}=\frac1{221}'),('E[X]=0(1/2)+2(1/2)=1',r'E[X]=0\cdot\tfrac12+2\cdot\tfrac12=1'),('E[X²]=0+4(1/2)=2',r'E[X^2]=0+4\cdot\tfrac12=2'),('E[X²]',r'E[X^2]'),('E[X]',r'E[X]'),('P(X=0)=e⁻⁶6⁰/0!=e⁻⁶',r'P(X=0)=e^{-6}\frac{6^0}{0!}=e^{-6}'),('λ=2×3=6',r'\lambda=2\cdot3=6'),('X~Uniform[2,8]',r'X\sim U[2,8]'),('X~Normal(10,4)',r'X\sim N(10,4)'),('Z=(14−10)/2=2',r'Z=\frac{14-10}{2}=2'),('P(X≤14)=Φ(2)',r'P(X\le14)=\Phi(2)'),('Φ(1)',r'\Phi(1)'),('(1/2)⁴=1/16',r'(1/2)^4=1/16'),('6/16=3/8',r'6/16=3/8'),
 ('F=AB+A¬B+AC',r'F=AB+A\overline B+AC'),('A(B+¬B)=A',r'A(B+\overline B)=A'),('F=A+AC',r'F=A+AC'),('F=¬AB+AB=B(¬A+A)',r'F=\overline AB+AB=B(\overline A+A)'),('F(A,B,C)=Σm(0,1,2,3)',r'F(A,B,C)=\sum m(0,1,2,3)'),('F=¬A',r'F=\overline A'),('A¬BC',r'A\overline BC'),('Sum=1⊕1⊕0=0',r'S=1\oplus1\oplus0=0'),('Carry=AB+ACin+BCin=1+0+0=1',r'C_{out}=AB+AC_{in}+BC_{in}=1+0+0=1'),('¬AI₀+AI₁',r'\overline AI_0+AI_1'),('2⁴=16',r'2^4=16'),('24/16=1.5',r'24/16=1.5'),
 ('EA=1000+12=1012',r'EA=1000+12=1012'),('2×10⁶×3=6×10⁶',r'2\cdot10^6\cdot3=6\cdot10^6'),('1/10⁹',r'1/10^9'),('16384/64=256',r'16384/64=256'),('256/4=64',r'256/4=64'),('log₂64=6',r'\log_2 64=6'),('32−6−6=20',r'32-6-6=20'),('0.04×50=2',r'0.04\cdot50=2'),('AMAT=4',r'AMAT=4'),('128×40=5120',r'128\cdot40=5120'),('0.2×0.1=0.02',r'0.2\cdot0.1=0.02'),('0.02×3=0.06',r'0.02\cdot3=0.06'),
 ('T(n)=2T(n/2)+n',r'T(n)=2T(n/2)+n'),('Θ(n log n)',r'\Theta(n\log n)'),('Θ(n²)',r'\Theta(n^2)'),('Θ(log n)',r'\Theta(\log n)'),('Θ(n)',r'\Theta(n)'),('n(n+1)/2',r'\frac{n(n+1)}2'),('log₂n',r'\log_2 n'),('O(V+E)',r'O(V+E)'),('O(V²)',r'O(V^2)'),('O(n log n)',r'O(n\log n)'),('O(log n)',r'O(\log n)'),('O(n²)',r'O(n^2)'),('O(n)',r'O(n)'),('O(1)',r'O(1)'),
 ('{0ⁿ1ⁿ:n≥0}',r'\{0^n1^n:n\ge0\}'),('w=0ᵖ1ᵖ',r'w=0^p1^p'),('|xy|≤p',r'|xy|\le p'),('|y|>0',r'|y|>0'),('{aⁿbⁿcⁿ:n≥0}',r'\{a^nb^nc^n:n\ge0\}'),('|vy|>0',r'|vy|>0'),('|vy|=0',r'|vy|=0'),('S→0S1 | ε',r'S\to0S1\mid\varepsilon'),('A→a|ε',r'A\to a\mid\varepsilon'),('FIRST(S)={a,b}',r'FIRST(S)=\{a,b\}'),('FIRST(a)={a}',r'FIRST(a)=\{a\}'),('S→Ab',r'S\to Ab'),('A→ε',r'A\to\varepsilon'),('A→a',r'A\to a'),
 ('A⁺={A,B,C,D}',r'A^+=\{A,B,C,D\}'),('A⁺={A,B,C}',r'A^+=\{A,B,C\}'),('B⁺={B,C}',r'B^+=\{B,C\}'),('A⁺={A}',r'A^+=\{A\}'),('BC→D',r'BC\to D'),('X→Y',r'X\to Y'),('A→B',r'A\to B'),('B→C',r'B\to C'),('A→C',r'A\to C'),('T1→T2',r'T_1\to T_2'),('T2→T1',r'T_2\to T_1'),
 ('7×4096+904=29576',r'7\cdot4096+904=29576'),('5000−4096=904',r'5000-4096=904'),('floor(5000/4096)=1',r'\lfloor5000/4096\rfloor=1'),('266×1024=272384',r'266\cdot1024=272384'),('1024/4=256',r'1024/4=256'),('3×3',r'3\cdot3'),
 ('12000/(12×10⁶)=0.001',r'\frac{12000}{12\cdot10^6}=0.001'),('1500×8=12000',r'1500\cdot8=12000'),('2^h−2',r'2^h-2'),('4000−20=3980',r'4000-20=3980'),('1480/8=185',r'1480/8=185'),('(1480+1480)/8=370',r'(1480+1480)/8=370'),('min(16000,10000)=10000',r'\min(16000,10000)=10000'),('10000−4000=6000',r'10000-4000=6000'),('1/(1/2)=2',r'\frac1{1/2}=2'),
]
# Longest-first avoids replacing a small term inside a reviewed larger expression.
pairs.sort(key=lambda x:len(x[0]),reverse=True)
pattern=re.compile('|'.join(re.escape(old) for old,_ in pairs))
lookup=dict(pairs)
delimiters=re.compile(r'(\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$)',re.S)
def typeset(text):
 parts=delimiters.split(text)
 for i in range(0,len(parts),2):
  parts[i]=pattern.sub(lambda m:r'\('+lookup[m.group()]+r'\)',parts[i])
 return ''.join(parts)
def walk(obj):
 if isinstance(obj,str):return typeset(obj)
 if isinstance(obj,list):return [walk(x) for x in obj]
 if isinstance(obj,dict):return {k:v if k in ['id','topic','topics','kind','code','equation','latex','afterSection','type'] else walk(v) for k,v in obj.items()}
 return obj
for s in subjects:
 for l in s['lessons']:
  # Guides already contain explicit TeX; code and identifiers are deliberately preserved.
  for key in ['intuition','prerequisite','sections','examples','pitfalls','revision','checks','tutorials']:
   l[key]=walk(l[key])
