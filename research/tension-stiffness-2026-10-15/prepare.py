"""Build an isolated, reproducible sensitivity model; never alter the flight model."""
from pathlib import Path
import shutil,subprocess,json,hashlib
HERE=Path(__file__).resolve().parent
SOURCE=Path('/home/david/repos/ardupilot-high-dof/Tools/simulation/paraglider')
MODEL=HERE/'model';MODEL.mkdir(exist_ok=True)
hashes={}
for p in SOURCE.iterdir():
    if p.suffix in ['.py','.json','.cpp','.npz'] or p.name=='build.sh':
        shutil.copyfile(p,MODEL/p.name);hashes[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
p=MODEL/'dynamics.cpp';s=p.read_text()
s=s.replace('State rhs(', 'thread_local double load_diag[8]={};\nState rhs(',1)
needle=' cp+=Hpi*Gp.transpose()*J;cc-=Hci*Gc.transpose()*J;'
replacement='''
 // Sensitivity model: scale only nominated geometric spring components.
 // T is tension along canopy-to-attachment direction, NOT |J| or load factor.
 V axis=rc.normalized(); double Tbase=-axis.dot(J),Tref=p[62];
 V geom=Rp*Jinv.transpose()*V(p[60]*p[21]*err.x(),0,p[61]*p[23]*err.z());
 V6 gp=V6::Zero(),gc=V6::Zero();gp.tail<3>()=geom;gc.tail<3>()=-geom;
 V6 dp=Hpi*gp,dc=Hci*gc;
 V dJ=A.ldlt().solve(-(Gp*dp-Gc*dc));double dT=-axis.dot(dJ);
 double denominator=Tref-dT,raw=1.,scale=1.;
 if(p[60]!=0 || p[61]!=0){
   if(Tref<=0 || denominator<=1e-6*Tref)return State::Constant(NAN);
   raw=(Tbase-dT)/denominator;scale=std::clamp(raw,.25,2.);
   cp+=(scale-1)*dp;cc+=(scale-1)*dc;J+=(scale-1)*dJ;
 }
 double tension=-axis.dot(J);
 load_diag[0]=tension;load_diag[1]=Tref;load_diag[2]=scale;load_diag[3]=raw;
 load_diag[4]=denominator/Tref;load_diag[5]=J.norm();
 load_diag[6]=scale-std::clamp(tension/Tref,.25,2.);
 load_diag[7]=(Gp*(cp+Hpi*Gp.transpose()*J)+wp.cross(wp.cross(rp))-Gc*(cc-Hci*Gc.transpose()*J)-wc.cross(wc.cross(rc))).norm();
 cp+=Hpi*Gp.transpose()*J;cc-=Hci*Gc.transpose()*J;'''
assert s.count(needle)==1;s=s.replace(needle,replacement)
s+='''
extern "C" void tension_diagnostic(const double*y,const double*u,const double*p,double mass,const double*w,double rpm,double voltage,double*out){
 State z=Eigen::Map<const State>(y);V wind=Eigen::Map<const V>(w);
 double target=743.5778222336925*voltage*pow(std::max(u[0]-.0005141016498671315,0.),.9086807307118114);
 double axial=(rot(z,0).transpose()*(z.segment<3>(7)-wind)).x();
 double input[3]={thrust(rpm,axial)/p[18],u[1],u[2]};
 rhs(z,input,p,mass,wind,rpm,(target-rpm)/.01756125311487475,torque(rpm,axial));
 for(int i=0;i<8;i++)out[i]=load_diag[i];
}
'''
p.write_text(s)
p=MODEL/'dynamics.py';s=p.read_text().replace('def params(p=None):',"KEYS+=['tension_roll_fraction','tension_yaw_fraction','tension_reference']\nDEFAULT.update(tension_roll_fraction=0.,tension_yaw_fraction=0.,tension_reference=1.)\n\ndef params(p=None):")
s+='''
lib.tension_diagnostic.argtypes=[ptr,ptr,ptr,ctypes.c_double,ptr,ctypes.c_double,ctypes.c_double,ptr]
def tension_diagnostic(sim,state,rpm,command,voltage=22.2,wind=(0.,0.,0.)):
 out=np.zeros(8)
 lib.tension_diagnostic(np.ascontiguousarray(state),np.ascontiguousarray(sim.controls(*command)),params(sim.parameters),sim.geometry['mass'],np.ascontiguousarray(wind,dtype=float),float(rpm),float(voltage),out)
 return out
''';p.write_text(s)
subprocess.run(['sh','build.sh'],cwd=MODEL,check=True)
diff=subprocess.run(['diff','-U0','--label','original/dynamics.cpp','--label','experiment/dynamics.cpp',str(SOURCE/'dynamics.cpp'),str(MODEL/'dynamics.cpp')],capture_output=True,text=True)
(HERE/'dynamics.patch').write_text(diff.stdout)
(HERE/'source-provenance.json').write_text(json.dumps(dict(source=str(SOURCE),source_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=SOURCE,text=True).strip(),hashes=hashes),indent=2)+'\n')
print('Isolated model built',MODEL)
