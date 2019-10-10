import React from 'react';
import Button from '@material-ui/core/Button';
import { Container, Grid, Typography, TextField, Divider, Table, TableBody, TableHead, TableRow, TableCell, Paper } from '@material-ui/core';
class App extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            currentTime: new Date(),
            eid_input: '',
            employee: null,
            punches: [],
            in_status: false, //True for already punched in, false for out of office,
            logged_in: false,
            punch_enabled: false,
            pay_period_start: null,
            viewPeriod: true
        }

        this.intv = null;
        this.onEnterEid = this.onEnterEid.bind(this);
        this.onPunch = this.onPunch.bind(this);
        this.onPrint = this.onPrint.bind(this);
    }

    componentDidMount() {
        this.intv = window.setInterval(() => this.setState({ currentTime: new Date() }), 1000);
        document.getElementsByTagName('input')[0].focus();
    }

    componentWillUnmount() {
        window.clearInterval(this.intv);
    }

    onPunch(ev) {
        this.setState({ punch_enabled: false });
        let f = new FormData();
        f.append('eid', this.state.employee.id);
        f.append('action', 'punch');
        fetch('/time.php', { method: 'POST', body: f })
            .then(response => response.json())
            .then(data => {
                if (data.err === 0) {
                    this.setState({ punches: [...this.state.punches, data.punch], in_status: !this.state.in_status });
                } else if (data.err === 1) { //Employee ID not found

                }
                window.setTimeout(() => { this.setState({ punch_enabled: true }) }, 60 * 5 * 1000); //re-enable button after 5 seconds
            });

    }

    onPrint(ev) {
        let page = document.createElement('iframe');
        let card = document.getElementById('punch-card').cloneNode(true);
        let kids = card.children;
        card.removeChild(kids[1]);
        page.style.position = "fixed";
        page.style.width = "0";
        page.style.height = "0";
        page.style.top = "0";
        page.style.left = "0";

        page.onload = () => {
            page.contentWindow.onbeforeunload = () => { document.body.removeChild(page); }
            page.contentWindow.onafterprint = () => { document.body.removeChild(page); }
            page.contentWindow.document.head.outerHTML = document.head.outerHTML;
            page.contentWindow.document.body.outerHTML = card.outerHTML;

            let sheet = page.contentWindow.document.createElement('style');
            sheet.media = "print";
            sheet.innerHTML = "html, body { size: landscape; width: 99%; max-width: 99%; max-height: 99% }";

            page.contentWindow.document.head.appendChild(sheet);
            page.contentWindow.focus();
            page.contentWindow.print();
        }

        document.body.appendChild(page);
    }

    onEnterEid(ev) {
        let f = new FormData();
        f.append('eid', this.state.eid_input);
        f.append('action', 'get');
        fetch('/time.php', { method: 'POST', body: f })
            .then(response => response.json())
            .then(data => {
                if (data.err === 0) {
                    this.setState({ pay_period_start: new Date(data.pay_period_start * 1000), punch_enabled: true, employee: data.employee, punches: data.punches, logged_in: true, in_status: !!(data.punches.length % 2) },
                        () => {
                            if (new Date(data.punches[data.punches.length - 1].time).getTime() > Date.now() - (1000 * 60 * 5)) {
                                this.setState({ punch_enabled: false });
                                window.setTimeout(() => { this.setState({ punch_enabled: true }) }, (new Date(data.punches[data.punches.length - 1].time).getTime()) - (Date.now() - (1000 * 60 * 5)));
                            }
                        }); // wait 5 minutes
                } else if (data.err === 1) { //Employee ID not found

                }
            });
    }

    render() {
        // const PunchesToday = (props) => {
        //     if (this.state.punches.length > 0) {
        //         let startOfDay = new Date();
        //         startOfDay.setHours(0, 0, 0, 0);
        //         return (
        //             <Grid style={{ marginBottom: '5rem' }} container direction="column" justify="center" alignItems="center" spacing={2}>
        //                 <Grid item>
        //                     <Typography variant="h4">Today's Punches</Typography>
        //                     <Divider />
        //                 </Grid>

        //                 {this.state.punches.filter(val => new Date(val.time) > startOfDay).map((val, ind) => {
        //                     let punchDateTime = new Date(val.time);
        //                     return (
        //                         <Grid item>
        //                             <Typography variant="h5">{`${punchDateTime.toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' })} - ${(ind % 2 == 0) ? 'IN' : 'OUT'}`}</Typography>
        //                         </Grid>
        //                     );
        //                 })}
        //             </Grid>
        //         )
        //     }
        //     return null;
        // }

        const PunchesThisPeriod = (props) => {
            let days = [];
            let rows = [];
            Object.entries(this.state.punches.filter(val => new Date(val.time) > this.state.pay_period_start)
                .reduce((result, p) => {
                    if (!result.hasOwnProperty(new Date(p.time).toLocaleDateString('en-us')))
                        result[new Date(p.time).toLocaleDateString('en-us')] = [];

                    result[new Date(p.time).toLocaleDateString('en-us')].push(new Date(p.time).toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' }));
                    return result;
                }, {}))
                .forEach(([key, val]) => {
                    rows.push([<TableCell>{this.state.employee.name}</TableCell>, <TableCell>{key}</TableCell>, ...val.map((val2) => {
                        return (<TableCell>{val2}</TableCell>)
                    })]);
                });

            if (this.state.punches.length > 0) {
                let total_time = 0;
                return (
                    <>
                        <Paper id="punch-card">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Punch In</TableCell>
                                        <TableCell>Punch Out</TableCell>
                                        <TableCell>Punch In</TableCell>
                                        <TableCell>Punch Out</TableCell>
                                        <TableCell>Total Time (hours)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>

                                    {rows.map(val => {
                                        let time = 0;
                                        for (let i = 2; i < val.length - 1; i += 2) {
                                            let val1 = Date.parse('1970-01-01 ' + val[i].props.children);
                                            let val2 = Date.parse('1970-01-01 ' + val[i + 1].props.children);
                                            time += (val2 - val1) / 1000 / 60 / 60;
                                        }
                                        total_time += time;
                                        return (
                                            <TableRow>
                                                {val.concat(Array(6 - val.length).fill(<TableCell>.</TableCell>)).slice(0, 6)}
                                                <TableCell>{time}</TableCell>
                                            </TableRow>
                                        )
                                    })}

                                    <TableRow>
                                        <TableCell colSpan={5} />
                                        <TableCell><Typography variant="h5">Time Grand Total</Typography></TableCell>
                                        <TableCell>{total_time}</TableCell>
                                    </TableRow>

                                </TableBody>
                            </Table>
                            <Button style={{ width: '100%', height: '6em' }} fullWidth size="large" disabled={!this.state.punch_enabled} id="print-btn" variant="contained" onClick={this.onPrint}>Print Time Card</Button>
                        </Paper>

                    </>
                )
            }
            return null;
        }

        return (
            <>
                <Container maxWidth="lg">
                    <Grid style={{ marginBottom: '5rem' }} container direction="column" justify="center" alignItems="center">
                        <Grid item>
                            <Typography variant="h3">{this.state.currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })}</Typography>
                        </Grid>
                        <Grid item>
                            <TextField onKeyUp={(ev) => { if (ev.keyCode === 13) { ev.preventDefault(); document.getElementById('enter-btn').click(); } }} variant="outlined" margin="normal" label="Employee ID" value={this.state.eid_input} onChange={(ev) => this.setState({ eid_input: ev.target.value })}></TextField>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <Button disabled={this.state.logged_in} id="enter-btn" variant="contained" onClick={this.onEnterEid}>Login</Button>
                        </Grid>
                    </Grid>

                    <Grid style={{ marginBottom: '5rem' }} container direction="row" justify="center" alignItems="center" spacing={8}>
                        <Grid item xs={12} sm={6}>
                            <Button style={{ width: '100%', height: '6em' }} fullWidth size="large" disabled={!this.state.punch_enabled} id="punch-btn" variant="contained" onClick={this.onPunch}>Punch {this.state.in_status ? 'Out' : 'In'}</Button>
                        </Grid>
                    </Grid>
                    <PunchesThisPeriod />

                </Container>



            </>
        )
    }
}

export default App;
