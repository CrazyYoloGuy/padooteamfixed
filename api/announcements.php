<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration - Update these with your actual database credentials
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_username';
$password = 'your_password';

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

// Get the request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Simple authentication check (you should implement proper JWT validation)
function checkAuth() {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Authorization required']);
        exit();
    }
    // Here you would validate the JWT token
    // For now, we'll just check if the header exists
}

switch ($method) {
    case 'GET':
        // Get all announcements
        checkAuth();
        try {
            $stmt = $pdo->query("SELECT * FROM announcements ORDER BY created_at DESC");
            $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($announcements);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch announcements']);
        }
        break;

    case 'POST':
        // Create new announcement
        checkAuth();
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['message']) || !isset($input['importance'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Message and importance are required']);
            exit();
        }

        if (!in_array($input['importance'], ['low', 'medium', 'high'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid importance level']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO announcements (message, importance, created_at) VALUES (?, ?, NOW()) RETURNING *");
            $stmt->execute([$input['message'], $input['importance']]);
            $announcement = $stmt->fetch(PDO::FETCH_ASSOC);
            
            http_response_code(201);
            echo json_encode($announcement);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create announcement']);
        }
        break;

    case 'DELETE':
        // Delete announcement
        checkAuth();
        $id = end($pathParts);
        
        if (!is_numeric($id)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid announcement ID']);
            exit();
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
            $result = $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Announcement deleted successfully']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Announcement not found']);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete announcement']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>
