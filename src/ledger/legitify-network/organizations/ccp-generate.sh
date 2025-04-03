function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

# Generate the connection profile for orgnewuniversity2
function gen_ccp_orgnewuniversity2() {
  local PP=$(one_line_pem $PEER0_OrgNewUniversity2MSP_PEM)
  local CP=$(one_line_pem $CA_OrgNewUniversity2MSP_PEM)
  sed -e "s/\${ORG}/orgnewuniversity2/" \
      -e "s/\${P0PORT}/11051/" \
      -e "s/\${CAPORT}/12054/" \
      -e "s#\${PEERPEM}#$PP#" \
      -e "s#\${CAPEM}#$CP#" \
      organizations/ccp-template.json > organizations/peerOrganizations/orgnewuniversity2.com/connection-orgnewuniversity2.json
}
PEER0_OrgNewUniversity2MSP_PEM=organizations/peerOrganizations/orgnewuniversity2.com/tlsca/tlsca.orgnewuniversity2.com-cert.pem
CA_OrgNewUniversity2MSP_PEM=organizations/peerOrganizations/orgnewuniversity2.com/ca/ca.orgnewuniversity2.com-cert.pem

echo "Generating CCP files for orgnewuniversity2"
gen_ccp_orgnewuniversity2
