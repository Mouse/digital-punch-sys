<?php

if (isset($_POST['eid'], $_POST['action'])) {
    $act = $_POST['action'];
    $eid = $_POST['eid'];
    $FIRST_START_DATE = new DateTime('10/03/2019', new DateTimeZone('GMT-0500'));
    $db = new mysqli('xena.lunarpages.com', 'farzan2_punch', 'pNf}T$z8wj^=', 'farzan2_timeclock');

    $db->query("SET time_zone = '-05:00'");

    $response = new stdClass;
    $response->employee = null;
    $response->pay_period_start = null;
    $response->punches = [];
    $response->punch = null;
    $response->err = 0;

    if ($act == 'punch') {
        $stmt = $db->prepare("INSERT INTO punch (eid) VALUES (?)");
        $stmt->bind_param('i', intval($eid));
        $stmt->execute();
        $response->punch = $db->query("SELECT * FROM punch WHERE id = " . $stmt->insert_id)->fetch_assoc();
    } else if ($act == 'get') {
        $stmt = $db->prepare("SELECT * FROM hourly_employees WHERE id = ?");

        $stmt->bind_param('i', intval($eid));
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->num_rows == 0) {
            $response->employee = $result->fetch_assoc();

            $stmt = $db->prepare("SELECT * FROM punch WHERE eid = ? AND `time` > ? ORDER BY `time`");
            $last_pay_period_start = $FIRST_START_DATE;
            $now = new DateTime('now');
            while ($last_pay_period_start < $now) {
                $last_pay_period_start->add(new DateInterval('P14D'));
            }
            $last_pay_period_start->sub(new DateInterval('P14D'));
            $response->pay_period_start = $last_pay_period_start->getTimestamp();
            $last_pay_period_start = $last_pay_period_start->getTimestamp();
            $stmt->bind_param('ii', $eid, $last_pay_period_start);
            $stmt->execute();
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $response->punches[] = $row;
            }
        } else {
            $response->err = 1;
        }
    }

    $db->close();
    echo json_encode($response);
}
