# Run with Windows PowerShell 5.1; uses the installed typed SOLIDWORKS API.
# Source CAD is opened read-only and exported as a separate copy.
param(
 [Parameter(Mandatory=$true)][string]$Source,
 [Parameter(Mandatory=$true)][string]$Destination
)
$ErrorActionPreference='Stop'
if(Test-Path -LiteralPath $Destination){throw 'Destination already exists'}
$install=Split-Path (Get-Process sldworks | Select-Object -First 1).Path
$dll=Join-Path $install 'SolidWorks.Interop.sldworks.dll'
$constants=Join-Path $install 'SolidWorks.Interop.swconst.dll'
Add-Type -Path $dll
Add-Type -Path $constants
Add-Type -ReferencedAssemblies @($dll,$constants) -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;
public class SWExport {
 public static string Export(string source,string destination) {
  ISldWorks sw=(ISldWorks)Marshal.GetActiveObject("SldWorks.Application");
  int errors=0,warnings=0;
  IModelDoc2 doc=(IModelDoc2)sw.GetOpenDocumentByName(source);
  if(doc==null)doc=(IModelDoc2)sw.OpenDoc6(source,(int)swDocumentTypes_e.swDocASSEMBLY,
    (int)swOpenDocOptions_e.swOpenDocOptions_Silent|(int)swOpenDocOptions_e.swOpenDocOptions_ReadOnly,"",ref errors,ref warnings);
  if(doc==null)throw new Exception("Open failed: "+errors+", warnings "+warnings);
  Console.WriteLine("Opened "+doc.GetPathName()+"; open errors="+errors+" warnings="+warnings);
  doc.ClearSelection2(true);
  bool ok=doc.Extension.SaveAs(destination,(int)swSaveAsVersion_e.swSaveAsCurrentVersion,
   (int)swSaveAsOptions_e.swSaveAsOptions_Silent|(int)swSaveAsOptions_e.swSaveAsOptions_Copy,null,ref errors,ref warnings);
  return "Export success="+ok+"; errors="+errors+"; warnings="+warnings;
 }
}
"@
New-Item -ItemType Directory -Force -Path (Split-Path $Destination) | Out-Null
[SWExport]::Export($Source,$Destination)
if(Test-Path -LiteralPath $Destination){Get-Item -LiteralPath $Destination | Select-Object FullName,Length}
