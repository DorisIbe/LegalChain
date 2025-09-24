
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("LegalChain - Basic Contract Deployment and Initialization", () => {
  it("should have correct initial state after deployment", () => {
    expect(simnet.blockHeight).toBeDefined();
    expect(simnet.blockHeight).toBeGreaterThan(0);
  });

  it("should have pre-initialized jurisdictions", () => {
    const { result: usNyJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-jurisdiction-info",
      [Cl.stringAscii("US-NY")],
      deployer
    );
    
    expect(usNyJurisdiction).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("New York, United States"),
        "legal-system": Cl.stringAscii("common-law"),
        "compliance-requirements": Cl.stringAscii("UCC-compliant"),
        "is-supported": Cl.bool(true),
        "regulatory-body": Cl.none()
      })
    );

    const { result: ukEngJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-jurisdiction-info", 
      [Cl.stringAscii("UK-ENG")],
      deployer
    );
    
    expect(ukEngJurisdiction).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("England and Wales"),
        "legal-system": Cl.stringAscii("common-law"),
        "compliance-requirements": Cl.stringAscii("UK-contract-law"),
        "is-supported": Cl.bool(true),
        "regulatory-body": Cl.none()
      })
    );

    const { result: deBwJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-jurisdiction-info",
      [Cl.stringAscii("DE-BW")],
      deployer
    );
    
    expect(deBwJurisdiction).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Baden-Wurttemberg, Germany"),
        "legal-system": Cl.stringAscii("civil-law"),
        "compliance-requirements": Cl.stringAscii("BGB-compliant"),
        "is-supported": Cl.bool(true),
        "regulatory-body": Cl.none()
      })
    );
  });

  it("should validate supported jurisdictions correctly", () => {
    const { result: supportedJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "is-jurisdiction-supported",
      [Cl.stringAscii("US-NY")],
      deployer
    );
    expect(supportedJurisdiction).toBeBool(true);

    const { result: unsupportedJurisdiction } = simnet.callReadOnlyFn(
      "legal_chain",
      "is-jurisdiction-supported", 
      [Cl.stringAscii("INVALID")],
      deployer
    );
    expect(unsupportedJurisdiction).toBeBool(false);
  });

  it("should initialize with correct contract state", () => {
    // Test that contract is deployed and accessible
    const { result: contractStatus } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-contract-status",
      [Cl.uint(999)], // Non-existent contract
      deployer
    );
    
    expect(contractStatus).toBeTuple({
      status: Cl.stringAscii("not-found"),
      signatures: Cl.uint(0),
      "required-signatures": Cl.uint(0),
      "expires-at": Cl.uint(0),
      "is-compliant": Cl.tuple({
        "signatures-met": Cl.bool(false),
        "witness-requirement-met": Cl.bool(false),
        "notarization-requirement-met": Cl.bool(false),
        "value-limit-met": Cl.bool(false)
      })
    });
  });

  it("should handle non-existent contract queries gracefully", () => {
    const { result: nonExistentContract } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-legal-contract",
      [Cl.uint(999)],
      deployer
    );
    expect(nonExistentContract).toBeNone();

    const { result: nonExistentTemplate } = simnet.callReadOnlyFn(
      "legal_chain", 
      "get-contract-template",
      [Cl.uint(999)],
      deployer
    );
    expect(nonExistentTemplate).toBeNone();
  });

  it("should handle non-existent legal entity queries gracefully", () => {
    const { result: nonExistentEntity } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-legal-entity",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(nonExistentEntity).toBeNone();
  });

  it("should allow legal entity registration", () => {
    const { result } = simnet.callPublicFn(
      "legal_chain",
      "register-legal-entity",
      [
        Cl.stringAscii("corporation"),
        Cl.stringAscii("US-NY"),
        Cl.stringAscii("12345678"),
        Cl.stringAscii("Test Corporation Inc.")
      ],
      wallet1
    );
    
    expect(result).toBeOk(Cl.bool(true));

    const { result: entityData } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-legal-entity",
      [Cl.principal(wallet1)],
      deployer
    );
    
    expect(entityData).toBeSome(
      Cl.tuple({
        "entity-type": Cl.stringAscii("corporation"),
        jurisdiction: Cl.stringAscii("US-NY"),
        "registration-number": Cl.stringAscii("12345678"),
        "verified-at": Cl.uint(simnet.blockHeight),
        "is-verified": Cl.bool(false),
        "legal-name": Cl.stringAscii("Test Corporation Inc.")
      })
    );
  });

  it("should reject legal entity registration with invalid jurisdiction", () => {
    const { result } = simnet.callPublicFn(
      "legal_chain",
      "register-legal-entity",
      [
        Cl.stringAscii("corporation"),
        Cl.stringAscii("INVALID"),
        Cl.stringAscii("12345678"),
        Cl.stringAscii("Test Corporation Inc.")
      ],
      wallet2
    );
    
    expect(result).toBeErr(Cl.uint(403)); // ERR_INVALID_JURISDICTION
  });
});

describe("LegalChain - Contract Management and Legal Framework", () => {
  it("should create contract templates successfully", () => {
    const { result } = simnet.callPublicFn(
      "legal_chain",
      "create-contract-template",
      [
        Cl.stringAscii("Employment Agreement"),
        Cl.stringAscii("employment"),
        Cl.stringAscii("US-NY"),
        Cl.stringAscii("abc123template456hash789"),
        Cl.stringAscii("standard")
      ],
      wallet1
    );
    
    expect(result).toBeOk(Cl.uint(1));

    const { result: template } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-contract-template",
      [Cl.uint(1)],
      deployer
    );
    
    expect(template).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Employment Agreement"),
        category: Cl.stringAscii("employment"),
        jurisdiction: Cl.stringAscii("US-NY"),
        creator: Cl.principal(wallet1),
        "template-hash": Cl.stringAscii("abc123template456hash789"),
        "compliance-level": Cl.stringAscii("standard"),
        "usage-count": Cl.uint(0),
        "is-verified": Cl.bool(false),
        "created-at": Cl.uint(simnet.blockHeight)
      })
    );
  });

  it("should reject template creation with invalid jurisdiction", () => {
    const { result } = simnet.callPublicFn(
      "legal_chain",
      "create-contract-template",
      [
        Cl.stringAscii("Test Template"),
        Cl.stringAscii("general"),
        Cl.stringAscii("INVALID"),
        Cl.stringAscii("hash123"),
        Cl.stringAscii("basic")
      ],
      wallet1
    );
    
    expect(result).toBeErr(Cl.uint(403)); // ERR_INVALID_JURISDICTION
  });

  it("should create legal contracts successfully", () => {
    // First create a template
    const { result: templateResult } = simnet.callPublicFn(
      "legal_chain",
      "create-contract-template",
      [
        Cl.stringAscii("Service Agreement"),
        Cl.stringAscii("service"),
        Cl.stringAscii("UK-ENG"),
        Cl.stringAscii("service123template456"),
        Cl.stringAscii("premium")
      ],
      wallet1
    );
    expect(templateResult).toBeOk(Cl.uint(1));

    // Create legal contract
    const futureBlock = simnet.blockHeight + 1000;
    const { result } = simnet.callPublicFn(
      "legal_chain",
      "create-legal-contract",
      [
        Cl.uint(1), // template-id
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]), // parties
        Cl.stringAscii("UK-ENG"),
        Cl.stringAscii("service"),
        Cl.uint(futureBlock), // expires-at
        Cl.stringAscii("contract789terms123hash456"),
        Cl.stringAscii("https://metadata.uri/contract1"),
        Cl.uint(50000), // total-value
        Cl.uint(2) // required-signatures
      ],
      wallet1
    );
    
    expect(result).toBeOk(Cl.uint(1));

    // Verify contract creation
    const { result: contract } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-legal-contract",
      [Cl.uint(1)],
      deployer
    );
    
    expect(contract).toBeSome(
      Cl.tuple({
        "template-id": Cl.uint(1),
        creator: Cl.principal(wallet1),
        parties: Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        jurisdiction: Cl.stringAscii("UK-ENG"),
        "contract-type": Cl.stringAscii("service"),
        "created-at": Cl.uint(simnet.blockHeight),
        "expires-at": Cl.uint(futureBlock),
        status: Cl.stringAscii("pending"),
        "terms-hash": Cl.stringAscii("contract789terms123hash456"),
        "metadata-uri": Cl.stringAscii("https://metadata.uri/contract1"),
        "total-value": Cl.uint(50000),
        "required-signatures": Cl.uint(2),
        "current-signatures": Cl.uint(0)
      })
    );
  });

  it("should reject contract creation with invalid inputs", () => {
    // Create a template first for these tests
    simnet.callPublicFn("legal_chain", "create-contract-template",
      [Cl.stringAscii("Test Template"), Cl.stringAscii("test"), Cl.stringAscii("US-NY"),
       Cl.stringAscii("test123"), Cl.stringAscii("standard")], wallet1);

    // Invalid jurisdiction
    const { result: invalidJurisdiction } = simnet.callPublicFn(
      "legal_chain",
      "create-legal-contract",
      [
        Cl.uint(1),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        Cl.stringAscii("INVALID"),
        Cl.stringAscii("service"),
        Cl.uint(simnet.blockHeight + 100),
        Cl.stringAscii("hash"),
        Cl.stringAscii("uri"),
        Cl.uint(1000),
        Cl.uint(2)
      ],
      wallet1
    );
    expect(invalidJurisdiction).toBeErr(Cl.uint(403)); // ERR_INVALID_JURISDICTION

    // Expired contract
    const { result: expiredContract } = simnet.callPublicFn(
      "legal_chain",
      "create-legal-contract",
      [
        Cl.uint(1),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        Cl.stringAscii("US-NY"),
        Cl.stringAscii("service"),
        Cl.uint(simnet.blockHeight - 1), // Already expired
        Cl.stringAscii("hash"),
        Cl.stringAscii("uri"),
        Cl.uint(1000),
        Cl.uint(2)
      ],
      wallet1
    );
    expect(expiredContract).toBeErr(Cl.uint(405)); // ERR_CONTRACT_EXPIRED

    // Too many required signatures
    const { result: tooManySignatures } = simnet.callPublicFn(
      "legal_chain",
      "create-legal-contract",
      [
        Cl.uint(1),
        Cl.list([Cl.principal(wallet1)]), // Only 1 party
        Cl.stringAscii("US-NY"),
        Cl.stringAscii("service"),
        Cl.uint(simnet.blockHeight + 100),
        Cl.stringAscii("hash"),
        Cl.stringAscii("uri"),
        Cl.uint(1000),
        Cl.uint(3) // Requires 3 signatures but only 1 party
      ],
      wallet1
    );
    expect(tooManySignatures).toBeErr(Cl.uint(407)); // ERR_INSUFFICIENT_SIGNATURES

    // Non-existent template
    const { result: nonExistentTemplate } = simnet.callPublicFn(
      "legal_chain",
      "create-legal-contract",
      [
        Cl.uint(999), // Non-existent template
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        Cl.stringAscii("US-NY"),
        Cl.stringAscii("service"),
        Cl.uint(simnet.blockHeight + 100),
        Cl.stringAscii("hash"),
        Cl.stringAscii("uri"),
        Cl.uint(1000),
        Cl.uint(2)
      ],
      wallet1
    );
    expect(nonExistentTemplate).toBeErr(Cl.uint(402)); // ERR_CONTRACT_NOT_FOUND
  });

  it("should handle contract signing workflow", () => {
    // Create template and contract first
    simnet.callPublicFn(
      "legal_chain",
      "create-contract-template",
      [
        Cl.stringAscii("Signing Test Template"),
        Cl.stringAscii("test"),
        Cl.stringAscii("US-NY"),
        Cl.stringAscii("signingtest123"),
        Cl.stringAscii("standard")
      ],
      wallet1
    );

    const contractCreationBlock = simnet.blockHeight;
    const expiryBlock = contractCreationBlock + 1000;
    
    const { result: contractResult } = simnet.callPublicFn(
      "legal_chain",
      "create-legal-contract",
      [
        Cl.uint(1),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        Cl.stringAscii("US-NY"),
        Cl.stringAscii("test"),
        Cl.uint(expiryBlock),
        Cl.stringAscii("signingterms123"),
        Cl.stringAscii("https://test.uri"),
        Cl.uint(10000),
        Cl.uint(2)
      ],
      wallet1
    );
    expect(contractResult).toBeOk(Cl.uint(1));

    // First signature
    const { result: firstSign } = simnet.callPublicFn(
      "legal_chain",
      "sign-contract",
      [
        Cl.uint(1),
        Cl.stringAscii("signature1hash123"),
        Cl.none()
      ],
      wallet1
    );
    expect(firstSign).toBeOk(Cl.stringAscii("signature-recorded"));

    // Second signature should finalize contract
    const { result: secondSign } = simnet.callPublicFn(
      "legal_chain",
      "sign-contract",
      [
        Cl.uint(1),
        Cl.stringAscii("signature2hash456"),
        Cl.none()
      ],
      wallet2
    );
    expect(secondSign).toBeOk(Cl.stringAscii("contract-signed-and-finalized"));

    // Check final contract status
    const { result: finalStatus } = simnet.callReadOnlyFn(
      "legal_chain",
      "get-contract-status",
      [Cl.uint(1)],
      deployer
    );
    
    expect(finalStatus).toBeTuple({
      status: Cl.stringAscii("active"),
      signatures: Cl.uint(2),
      "required-signatures": Cl.uint(2),
      "expires-at": Cl.uint(expiryBlock),
      "is-compliant": Cl.tuple({
        "signatures-met": Cl.bool(true),
        "witness-requirement-met": Cl.bool(true),
        "notarization-requirement-met": Cl.bool(true),
        "value-limit-met": Cl.bool(true)
      })
    });
  });

  it("should reject invalid signature attempts", () => {
    // Create contract for testing
    simnet.callPublicFn("legal_chain", "create-contract-template",
      [Cl.stringAscii("Invalid Sign Test"), Cl.stringAscii("test"), Cl.stringAscii("US-NY"), 
       Cl.stringAscii("invalidsign123"), Cl.stringAscii("standard")], wallet1);
    
    simnet.callPublicFn("legal_chain", "create-legal-contract",
      [Cl.uint(1), Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]), 
       Cl.stringAscii("US-NY"), Cl.stringAscii("test"), Cl.uint(simnet.blockHeight + 100),
       Cl.stringAscii("terms123"), Cl.stringAscii("uri"), Cl.uint(1000), Cl.uint(2)], wallet1);

    // Non-party trying to sign
    const { result: nonPartySign } = simnet.callPublicFn(
      "legal_chain",
      "sign-contract",
      [Cl.uint(1), Cl.stringAscii("invalidhash"), Cl.none()],
      deployer // Not a party to the contract
    );
    expect(nonPartySign).toBeErr(Cl.uint(406)); // ERR_INVALID_PARTY

    // Sign once
    simnet.callPublicFn("legal_chain", "sign-contract",
      [Cl.uint(1), Cl.stringAscii("hash1"), Cl.none()], wallet1);

    // Try to sign again (double signing)
    const { result: doubleSign } = simnet.callPublicFn(
      "legal_chain",
      "sign-contract",
      [Cl.uint(1), Cl.stringAscii("hash2"), Cl.none()],
      wallet1
    );
    expect(doubleSign).toBeErr(Cl.uint(404)); // ERR_CONTRACT_ALREADY_SIGNED

    // Non-existent contract
    const { result: nonExistentContract } = simnet.callPublicFn(
      "legal_chain",
      "sign-contract",
      [Cl.uint(999), Cl.stringAscii("hash"), Cl.none()],
      wallet2
    );
    expect(nonExistentContract).toBeErr(Cl.uint(402)); // ERR_CONTRACT_NOT_FOUND
  });

  it("should validate compliance correctly", () => {
    // Create contract for compliance testing
    simnet.callPublicFn("legal_chain", "create-contract-template",
      [Cl.stringAscii("Compliance Test"), Cl.stringAscii("employment"), Cl.stringAscii("US-NY"),
       Cl.stringAscii("compliance123"), Cl.stringAscii("standard")], wallet1);
    
    const { result } = simnet.callPublicFn("legal_chain", "create-legal-contract",
      [Cl.uint(1), Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]), 
       Cl.stringAscii("US-NY"), Cl.stringAscii("employment"), Cl.uint(simnet.blockHeight + 200),
       Cl.stringAscii("employment123"), Cl.stringAscii("uri"), Cl.uint(5000), Cl.uint(2)], wallet1);
    expect(result).toBeOk(Cl.uint(1));

    // Check initial compliance (should fail signatures)
    const { result: initialCompliance } = simnet.callReadOnlyFn(
      "legal_chain",
      "check-compliance",
      [Cl.uint(1)],
      deployer
    );
    
    expect(initialCompliance).toBeTuple({
      "signatures-met": Cl.bool(false),
      "witness-requirement-met": Cl.bool(true),
      "notarization-requirement-met": Cl.bool(true),
      "value-limit-met": Cl.bool(true)
    });

    // Add signatures
    simnet.callPublicFn("legal_chain", "sign-contract",
      [Cl.uint(1), Cl.stringAscii("sig1"), Cl.none()], wallet1);
    simnet.callPublicFn("legal_chain", "sign-contract", 
      [Cl.uint(1), Cl.stringAscii("sig2"), Cl.none()], wallet2);

    // Check final compliance (should pass all)
    const { result: finalCompliance } = simnet.callReadOnlyFn(
      "legal_chain",
      "check-compliance",
      [Cl.uint(1)],
      deployer
    );
    
    expect(finalCompliance).toBeTuple({
      "signatures-met": Cl.bool(true),
      "witness-requirement-met": Cl.bool(true),
      "notarization-requirement-met": Cl.bool(true),
      "value-limit-met": Cl.bool(true)
    });
  });
});


