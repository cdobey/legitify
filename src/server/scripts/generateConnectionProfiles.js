const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
require("dotenv").config();

// Get the Fabric IP address from environment variables
const FABRIC_IP = process.env.FABRIC_IP || "localhost";

// Organizations to process
const organizations = [
  { name: "orguniversity", mspId: "OrgUniversityMSP" },
  { name: "orgemployer", mspId: "OrgEmployerMSP" },
  { name: "orgindividual", mspId: "OrgIndividualMSP" },
];

// Base directories
const baseDir = path.resolve(__dirname, "../../ledger/legitify-network");
const templateDir = path.join(baseDir, "organizations");
const outputDir = path.join(baseDir, "organizations/peerOrganizations");

// Ensure the output directories exist
for (const org of organizations) {
  const orgDir = path.join(outputDir, `${org.name}.com`);
  if (!fs.existsSync(orgDir)) {
    fs.mkdirSync(orgDir, { recursive: true });
    console.log(`Created directory: ${orgDir}`);
  }
}

// Process each organization
for (const org of organizations) {
  try {
    // Get TLS certificates
    const tlsCACertsPath = path.join(
      outputDir,
      `${org.name}.com/tlscacerts/ca.crt`
    );
    const peerTLSPath = path.join(
      outputDir,
      `${org.name}.com/peers/peer0.${org.name}.com/tls/ca.crt`
    );
    const caTLSPath = path.join(
      outputDir,
      `${org.name}.com/ca/ca.${org.name}.com-cert.pem`
    );

    let peerPem = "";
    let caPem = "";

    try {
      if (fs.existsSync(peerTLSPath)) {
        peerPem = fs.readFileSync(peerTLSPath, "utf8");
      } else {
        console.warn(`Warning: Peer TLS cert not found at ${peerTLSPath}`);
      }

      if (fs.existsSync(caTLSPath)) {
        caPem = fs.readFileSync(caTLSPath, "utf8");
      } else if (fs.existsSync(tlsCACertsPath)) {
        caPem = fs.readFileSync(tlsCACertsPath, "utf8");
      } else {
        console.warn(
          `Warning: CA TLS cert not found at ${caTLSPath} or ${tlsCACertsPath}`
        );
      }
    } catch (err) {
      console.warn(`Warning: Error reading certificates: ${err.message}`);
      // Continue with empty certificates - they will need to be added manually
    }

    // Process JSON template
    const jsonTemplatePath = path.join(templateDir, "ccp-template.json");
    const jsonTemplate = fs.readFileSync(jsonTemplatePath, "utf8");

    const jsonOutput = jsonTemplate
      .replace(/\${ORG}/g, org.name)
      .replace(
        /\${ORGCAP}/g,
        org.name.charAt(0).toUpperCase() + org.name.slice(1)
      )
      .replace(/\${PEERPEM}/g, peerPem.replace(/\n/g, "\\n"))
      .replace(/\${CAPEM}/g, caPem.replace(/\n/g, "\\n"))
      .replace(/\${IP}/g, FABRIC_IP);

    const jsonOutputPath = path.join(
      outputDir,
      `${org.name}.com/connection-${org.name}.json`
    );
    fs.writeFileSync(jsonOutputPath, jsonOutput);
    console.log(`Generated JSON connection profile at: ${jsonOutputPath}`);

    // Process YAML template
    const yamlTemplatePath = path.join(templateDir, "ccp-template.yaml");
    let yamlTemplate = fs.readFileSync(yamlTemplatePath, "utf8");

    const yamlOutput = yamlTemplate
      .replace(/\${ORG}/g, org.name)
      .replace(
        /\${ORGCAP}/g,
        org.name.charAt(0).toUpperCase() + org.name.slice(1)
      )
      .replace(/\${PEERPEM}/g, peerPem)
      .replace(/\${CAPEM}/g, caPem)
      .replace(/\${IP}/g, FABRIC_IP);

    const yamlOutputPath = path.join(
      outputDir,
      `${org.name}.com/connection-${org.name}.yaml`
    );
    fs.writeFileSync(yamlOutputPath, yamlOutput);
    console.log(`Generated YAML connection profile at: ${yamlOutputPath}`);
  } catch (error) {
    console.error(`Error processing organization ${org.name}:`, error);
  }
}

console.log("Connection profiles generation completed");
