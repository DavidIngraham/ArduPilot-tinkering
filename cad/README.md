# Micro-AGU CAD

The native SolidWorks source is in [solidworks/](solidworks/). Open **microAGU.SLDASM**, keeping all the adjacent parts and subassemblies together. These are byte-for-byte copies of the Windows project as of October 13, 2026; the Windows originals remain in place. [manifest.json](manifest.json) records sizes and SHA-256 hashes.

Assembly references and mates are preserved in the original files. This copy has not been reopened and dependency-resolved in SolidWorks; external library references, if any, may still require their original locations. Do not treat this as a newly validated Pack and Go export.

## Rendered models and tools

The browser-ready, articulated models and their export metadata live in [viewer/public/models](../viewer/public/models/). The [viewer tools](../viewer/tools/) contain the SolidWorks export and model-processing scripts. Render assets are derived geometry; the editable design remains here.

The CAD prop file is named `APC 9x6 CW.SLDPRT`; the flight-tested prop was **9x4.5**, so the filename is not a flight hardware specification. See the [build article](../docs/micro-agu-design.md) for the actual avionics and propulsion configuration.

## Working copies

For now, continue editing the Windows CAD folder. Copy changed native files here deliberately and refresh the manifest before committing; there is no automatic two-way sync. Keep filenames unchanged so neighboring assembly references remain usable. SolidWorks lock and backup files are excluded from Git. Native CAD is stored directly in Git, with no LFS requirement.
