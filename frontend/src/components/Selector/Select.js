import * as React from 'react';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export default function BasicSelect(props) {
    return (    
        <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label" style={{background: "#1a203c", marginRight: "0.3rem", color: "white"}}>{props.selectorName}</InputLabel>
            <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                label="Age"
                style={{color:"white"}}
                onChange={(e)=>props.handleChange(e)}
                disabled={props.disable}
            >
                {props.items.map((item, idx) => {
                    return (
                        <MenuItem value={idx+1}> {item} </MenuItem>
                    );
                })}
            </Select>
        </FormControl>
        </Box>
    );
}