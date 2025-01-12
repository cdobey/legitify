#!/bin/bash

function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

function json_ccp {
    local PP=$(one_line_pem $4)
    local CP=$(one_line_pem $5)
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${P0PORT}/$2/" \
        -e "s/\${CAPORT}/$3/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        organizations/ccp-template.json
}

function yaml_ccp {
    local PP=$(one_line_pem $4)
    local CP=$(one_line_pem $5)
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${P0PORT}/$2/" \
        -e "s/\${CAPORT}/$3/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        organizations/ccp-template.yaml | sed -e $'s/\\\\n/\\\n          /g'
}

ORG=1
P0PORT=7051
CAPORT=7054
PEERPEM=organizations/peerOrganizations/orguniversity.com/tlsca/tlsca.orguniversity.com-cert.pem
CAPEM=organizations/peerOrganizations/orguniversity.com/ca/ca.orguniversity.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/orguniversity.com/connection-orguniversity.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/orguniversity.com/connection-orguniversity.yaml

ORG=2
P0PORT=8051
CAPORT=8054
PEERPEM=organizations/peerOrganizations/orgemployer.com/tlsca/tlsca.orgemployer.com-cert.pem
CAPEM=organizations/peerOrganizations/orgemployer.com/ca/ca.orgemployer.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/orgemployer.com/connection-orgemployer.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/orgemployer.com/connection-orgemployer.yaml

ORG=3
P0PORT=9051
CAPORT=9054
PEERPEM=organizations/peerOrganizations/orgindividual.com/tlsca/tlsca.orgindividual.com-cert.pem
CAPEM=organizations/peerOrganizations/orgindividual.com/ca/ca.orgindividual.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/orgindividual.com/connection-orgindividual.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/orgindividual.com/connection-orgindividual.yaml