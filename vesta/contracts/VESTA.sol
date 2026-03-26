// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VESTA — Vegetation Satellite Tracker Analytics
 * @notice Certificados de sostenibilidad vitivinícola on-chain
 *         Cada NFT representa un análisis satelital Sentinel-2 verificado
 */
contract VESTA is ERC721URIStorage, Ownable {
    using Strings for uint256;
    using Strings for int256;

    uint256 private _tokenIdCounter;

    struct Certificate {
        string bodega;
        string coordenadas;
        uint256 timestamp;
        string imageHash;
        int256 ndvi;
        int256 ndre;
        int256 ndwi;
        string climateEvent;
        bool isLimitedEdition;
    }

    mapping(uint256 => Certificate) private _certificates;
    mapping(address => uint256[]) private _ownerTokens;

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed to,
        string bodega,
        bool isLimitedEdition
    );

    constructor() ERC721("VESTA Certificate", "VESTA") Ownable(msg.sender) {}

    /**
     * @notice Mintea un certificado de análisis satelital
     * @param bodega Nombre de la bodega
     * @param coordenadas Coordenadas GPS "-33.6644,-69.2368"
     * @param imageHash SHA256 de la imagen Sentinel-2
     * @param ndvi NDVI × 1000 (ej: 650 = 0.650)
     * @param ndre NDRE × 1000
     * @param ndwi NDWI × 1000
     * @param climateEvent Evento climático o "" si no hay
     */
    function mintCertificate(
        string memory bodega,
        string memory coordenadas,
        string memory imageHash,
        int256 ndvi,
        int256 ndre,
        int256 ndwi,
        string memory climateEvent
    ) public returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        bool limited = bytes(climateEvent).length > 0;

        _certificates[tokenId] = Certificate({
            bodega: bodega,
            coordenadas: coordenadas,
            timestamp: block.timestamp,
            imageHash: imageHash,
            ndvi: ndvi,
            ndre: ndre,
            ndwi: ndwi,
            climateEvent: climateEvent,
            isLimitedEdition: limited
        });

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _buildTokenURI(tokenId));

        emit CertificateMinted(tokenId, msg.sender, bodega, limited);

        return tokenId;
    }

    /**
     * @notice Devuelve los datos completos del certificado
     */
    function getCertificate(uint256 tokenId) public view returns (Certificate memory) {
        require(_ownerOf(tokenId) != address(0), "VESTA: token no existe");
        return _certificates[tokenId];
    }

    /**
     * @notice Devuelve todos los tokenIds de un owner
     */
    function getCollectionByOwner(address owner) public view returns (uint256[] memory) {
        return _ownerTokens[owner];
    }

    /**
     * @notice Verifica si un token es edición limitada por evento climático
     */
    function isLimitedEdition(uint256 tokenId) public view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "VESTA: token no existe");
        return _certificates[tokenId].isLimitedEdition;
    }

    /**
     * @dev Construye el tokenURI como JSON on-chain en base64
     */
    function _buildTokenURI(uint256 tokenId) internal view returns (string memory) {
        Certificate memory cert = _certificates[tokenId];

        string memory attributes = string(abi.encodePacked(
            '[',
            '{"trait_type":"Bodega","value":"', cert.bodega, '"},',
            '{"trait_type":"Coordenadas","value":"', cert.coordenadas, '"},',
            '{"trait_type":"Vigor Vegetativo","value":', _int256ToString(cert.ndvi), '},',
            '{"trait_type":"Madurez","value":', _int256ToString(cert.ndre), '},',
            '{"trait_type":"Humedad Foliar","value":', _int256ToString(cert.ndwi), '},',
            '{"trait_type":"Imagen Hash","value":"', cert.imageHash, '"},',
            '{"trait_type":"Edicion Limitada","value":"', cert.isLimitedEdition ? "Si" : "No", '"}',
            cert.isLimitedEdition ? string(abi.encodePacked(',{"trait_type":"Evento Climatico","value":"', cert.climateEvent, '"}')) : '',
            ']'
        ));

        string memory name = string(abi.encodePacked(
            cert.isLimitedEdition ? "VESTA Edicion Limitada #" : "VESTA Certificado #",
            tokenId.toString()
        ));

        string memory description = cert.isLimitedEdition
            ? string(abi.encodePacked("Cosecha historica - ", cert.climateEvent, " - ", cert.bodega))
            : string(abi.encodePacked("Certificado de sostenibilidad satelital - ", cert.bodega));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"', name, '",',
            '"description":"', description, '",',
            '"image":"https://vesta-satellite.vercel.app/api/og/', tokenId.toString(), '",',
            '"attributes":', attributes, ',',
            '"bodega":"', cert.bodega, '",',
            '"coordenadas":"', cert.coordenadas, '",',
            '"timestamp":', cert.timestamp.toString(), ',',
            '"imageHash":"', cert.imageHash, '",',
            '"ndvi":', _int256ToString(cert.ndvi), ',',
            '"ndre":', _int256ToString(cert.ndre), ',',
            '"ndwi":', _int256ToString(cert.ndwi), ',',
            '"climateEvent":"', cert.climateEvent, '",',
            '"isLimitedEdition":', cert.isLimitedEdition ? "true" : "false",
            '}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @dev Convierte int256 a string (maneja negativos)
     */
    function _int256ToString(int256 value) internal pure returns (string memory) {
        if (value < 0) {
            return string(abi.encodePacked("-", uint256(-value).toString()));
        }
        return uint256(value).toString();
    }

    /**
     * @dev Hook ejecutado después de cada transfer para mantener el índice de owner
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = super._update(to, tokenId, auth);

        // Remover del owner anterior
        if (from != address(0)) {
            uint256[] storage fromTokens = _ownerTokens[from];
            for (uint256 i = 0; i < fromTokens.length; i++) {
                if (fromTokens[i] == tokenId) {
                    fromTokens[i] = fromTokens[fromTokens.length - 1];
                    fromTokens.pop();
                    break;
                }
            }
        }

        // Agregar al nuevo owner
        if (to != address(0)) {
            _ownerTokens[to].push(tokenId);
        }

        return from;
    }
}
