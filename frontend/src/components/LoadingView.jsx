import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function LoadingView() {
  return (
    <div className="grid h-full w-full place-items-center justify-center bg-black text-white">
      <div>
        <Box sx={{ display: 'flex' }}>
          <CircularProgress />
        </Box>
        Loading...
      </div>
    </div>
  );
}
